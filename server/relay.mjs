// Relais temps réel des parties multijoueur.
// Le navigateur du Conteur fait tourner la partie et calcule ce que chaque joueur a le
// droit de voir ; le relais ne fait que distribuer ces vues, gérer les salons et le chat.
import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { WebSocketServer } from 'ws';

export const RELAY_PATH = '/ws';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I ni O, trop proches de 1 et 0
const MAX_PLAYERS = 15;
const MAX_NAME = 20;
const MAX_TEXT = 500;
const MAX_HISTORY = 300;
const ROOM_TTL = 12 * 60 * 60 * 1000; // un salon sans connexion est supprimé après 12 h

const SAVE_DELAY = 1000;

const rooms = new Map();

// ----- Sauvegarde des salons sur disque : une partie survit au redémarrage du serveur -----
const store = { file: null, timer: null };

const serialize = () => JSON.stringify([...rooms.values()].map((room) => ({
  code: room.code,
  token: room.token,
  lastSeen: room.lastSeen,
  players: [...room.players.entries()].map(([key, p]) => [key, { name: p.name }]),
  state: room.state,
  chat: room.chat,
})));

export const flushRooms = () => {
  if (!store.file) return;
  clearTimeout(store.timer);
  store.timer = null;
  try {
    mkdirSync(dirname(store.file), { recursive: true });
    // Écriture atomique : un arrêt en cours d'écriture ne corrompt pas la sauvegarde
    writeFileSync(`${store.file}.tmp`, serialize());
    renameSync(`${store.file}.tmp`, store.file);
  } catch (err) {
    console.error(`Sauvegarde des salons impossible : ${err.message}`);
  }
};

const persist = () => {
  if (!store.file || store.timer) return;
  store.timer = setTimeout(flushRooms, SAVE_DELAY);
  store.timer.unref();
};

const loadRooms = (file) => {
  store.file = file;
  if (!existsSync(file)) return;
  try {
    for (const saved of JSON.parse(readFileSync(file, 'utf8'))) {
      if (Date.now() - saved.lastSeen > ROOM_TTL) continue;
      rooms.set(saved.code, {
        code: saved.code,
        token: saved.token,
        lastSeen: saved.lastSeen,
        host: null,
        players: new Map(saved.players.map(([key, p]) => [key, { name: p.name, ws: null }])),
        // L'heure du Conteur est recalée à sa prochaine publication
        state: saved.state ? { ...saved.state, receivedAt: Date.now() } : null,
        chat: saved.chat ?? [],
      });
    }
  } catch (err) {
    console.error(`Lecture des salons sauvegardés impossible : ${err.message}`);
  }
};

const send = (ws, message) => {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
};

const newCode = () => {
  for (;;) {
    const code = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
    if (!rooms.has(code)) return code;
  }
};

const roster = (room) => [...room.players.entries()].map(([key, p]) => ({ key, name: p.name, online: !!p.ws }));

const sendRoster = (room) => send(room.host, { t: 'roster', players: roster(room) });

const sendView = (room, key) => {
  const player = room.players.get(key);
  if (!player?.ws) return;
  send(player.ws, {
    t: 'view',
    public: room.state?.public ?? null,
    view: room.state?.views?.[key] ?? null,
    hostOnline: !!room.host,
    // Heure du Conteur à l'instant de l'envoi, pour afficher le même compte à rebours partout
    hostNow: room.state ? room.state.hostNow + (Date.now() - room.state.receivedAt) : null,
  });
};

const canSee = (message, who) =>
  who === 'host' || message.to === 'all' || message.from === who || message.to === who;

// Message tel qu'il est envoyé à un destinataire : les clés des joueurs, qui donnent
// accès à leur place, ne quittent jamais le serveur
const outgoing = (message, who) => ({
  id: message.id,
  ts: message.ts,
  name: message.name,
  toName: message.toName,
  text: message.text,
  mine: message.from === who,
  private: message.to !== 'all',
  fromHost: message.from === 'host',
});

const history = (room, who) => room.chat.filter((m) => canSee(m, who)).map((m) => outgoing(m, who));

const touch = (room) => { room.lastSeen = Date.now(); };

const handlers = {
  // Le Conteur crée un salon, ou reprend le sien après un rechargement
  host(ws, msg) {
    let room = rooms.get(msg.room);
    if (!room || room.token !== msg.token) {
      room = { code: newCode(), token: randomUUID(), host: null, players: new Map(), state: null, chat: [], lastSeen: Date.now() };
      rooms.set(room.code, room);
      persist();
    }
    if (room.host && room.host !== ws) room.host.close(4000, 'replaced');
    room.host = ws;
    ws.session = { room, role: 'host' };
    send(ws, { t: 'hosted', room: room.code, token: room.token });
    send(ws, { t: 'history', messages: history(room, 'host') });
    sendRoster(room);
    for (const key of room.players.keys()) sendView(room, key);
  },

  // Un joueur rejoint le salon, ou y revient avec la clé reçue à sa première connexion
  join(ws, msg) {
    const room = rooms.get(String(msg.room ?? '').toUpperCase());
    if (!room) return send(ws, { t: 'error', code: 'no-room' });

    let key = msg.key && room.players.has(msg.key) ? msg.key : null;
    if (!key) {
      const name = String(msg.name ?? '').trim().slice(0, MAX_NAME);
      if (!name) return send(ws, { t: 'error', code: 'name-required' });
      if (room.state && !room.state.public.joinOpen) return send(ws, { t: 'error', code: 'closed' });
      if (room.players.size >= MAX_PLAYERS) return send(ws, { t: 'error', code: 'full' });
      const taken = [...room.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase());
      if (taken) return send(ws, { t: 'error', code: 'name-taken' });
      key = randomUUID();
      room.players.set(key, { name, ws: null });
      persist();
    }

    const player = room.players.get(key);
    if (player.ws && player.ws !== ws) player.ws.close(4000, 'replaced');
    player.ws = ws;
    ws.session = { room, role: 'player', key };
    send(ws, { t: 'joined', room: room.code, key, name: player.name });
    send(ws, { t: 'history', messages: history(room, key) });
    sendView(room, key);
    sendRoster(room);
  },

  // Le Conteur publie l'état public et la vue de chaque joueur
  state(ws, msg) {
    const { room, role } = ws.session ?? {};
    if (role !== 'host') return;
    room.state = { public: msg.public, views: msg.views ?? {}, hostNow: Number(msg.hostNow) || Date.now(), receivedAt: Date.now() };
    persist();
    for (const key of room.players.keys()) sendView(room, key);
  },

  // Le Conteur retire un joueur du cercle
  kick(ws, msg) {
    const { room, role } = ws.session ?? {};
    if (role !== 'host') return;
    const player = room.players.get(msg.key);
    if (!player) return;
    room.players.delete(msg.key);
    persist();
    send(player.ws, { t: 'kicked' });
    player.ws?.close(4001, 'kicked');
    sendRoster(room);
  },

  chat(ws, msg) {
    const { room, role, key } = ws.session ?? {};
    const text = String(msg.text ?? '').trim().slice(0, MAX_TEXT);
    if (!room || !text) return;

    let message;
    if (role === 'host') {
      const to = msg.to === 'all' || room.players.has(msg.to) ? msg.to : null;
      if (!to) return;
      message = { from: 'host', name: 'Conteur', to, toName: to === 'all' ? null : room.players.get(to).name, text };
    } else {
      // Un joueur parle à tous ou chuchote à un autre joueur quand la discussion est ouverte
      // (le jour) ; il peut écrire au Conteur en privé à tout moment
      let to = 'host';
      if (msg.to === 'all') to = 'all';
      else if (typeof msg.to === 'string' && msg.to.startsWith('p:')) {
        // Les joueurs se désignent par leur numéro public, jamais par leur clé
        const id = Number(msg.to.slice(2));
        to = [...room.players.keys()].find((k) => k !== key && room.state?.views?.[k]?.id === id) ?? null;
        if (!to) return;
      }
      if (to !== 'host' && !room.state?.public.chatOpen) return send(ws, { t: 'error', code: 'chat-closed' });
      message = {
        from: key,
        name: room.players.get(key).name,
        to,
        toName: to === 'all' ? null : to === 'host' ? 'Conteur' : room.players.get(to).name,
        text,
      };
    }
    message.id = randomUUID();
    message.ts = Date.now();
    room.chat.push(message);
    if (room.chat.length > MAX_HISTORY) room.chat.shift();
    persist();

    // Le Conteur voit tous les messages, y compris les chuchotements entre joueurs
    send(room.host, { t: 'chat', message: outgoing(message, 'host') });
    for (const [playerKey, player] of room.players) {
      if (canSee(message, playerKey)) send(player.ws, { t: 'chat', message: outgoing(message, playerKey) });
    }
  },

  // Un joueur désigne les cibles de sa capacité ; le Conteur valide
  targets(ws, msg) {
    const { room, role, key } = ws.session ?? {};
    if (role !== 'player' || !Array.isArray(msg.ids)) return;
    send(room.host, { t: 'targets', key, ids: msg.ids.slice(0, 2) });
  },

  // Nomination, vote ou partage de bluff d'un joueur, transmis au Conteur qui tient les comptes
  act(ws, msg) {
    const { room, role, key } = ws.session ?? {};
    if (role !== 'player' || !['nominate', 'vote', 'bluff'].includes(msg.kind)) return;
    send(room.host, { t: 'act', key, kind: msg.kind, id: msg.id, value: msg.value === true, role: String(msg.role ?? '') });
  },
};

const onClose = (ws) => {
  const { room, role, key } = ws.session ?? {};
  if (!room) return;
  touch(room);
  if (role === 'host' && room.host === ws) {
    room.host = null;
    for (const playerKey of room.players.keys()) sendView(room, playerKey);
  } else if (role === 'player' && room.players.get(key)?.ws === ws) {
    room.players.get(key).ws = null;
    sendRoster(room);
  }
};

// Branche le relais sur un serveur HTTP existant (Vite en développement, server/index.mjs en production)
export const attachRelay = (httpServer, { storeFile = null } = {}) => {
  if (storeFile && !store.file) loadRooms(storeFile);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024 });

  httpServer.on('upgrade', (request, socket, head) => {
    if (new URL(request.url, 'http://localhost').pathname !== RELAY_PATH) return;
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws));
  });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }
      const handler = Object.hasOwn(handlers, msg?.t) ? handlers[msg.t] : null;
      if (!handler) return;
      if (ws.session) touch(ws.session.room);
      handler(ws, msg);
    });
    ws.on('close', () => onClose(ws));
    ws.on('error', () => {});
  });

  const sweep = setInterval(() => {
    for (const [code, room] of rooms) {
      const connected = room.host || [...room.players.values()].some((p) => p.ws);
      if (!connected && Date.now() - room.lastSeen > ROOM_TTL) {
        rooms.delete(code);
        persist();
      }
    }
  }, 10 * 60 * 1000);
  sweep.unref();
  httpServer.on('close', () => {
    clearInterval(sweep);
    wss.close();
  });

  return wss;
};
