// Relais temps réel des parties multijoueur.
// Le navigateur du Conteur fait tourner la partie et calcule ce que chaque joueur a le
// droit de voir ; le relais ne fait que distribuer ces vues, gérer les salons et le chat.
import { randomInt, randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

export const RELAY_PATH = '/ws';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I ni O, trop proches de 1 et 0
const MAX_PLAYERS = 15;
const MAX_NAME = 20;
const MAX_TEXT = 500;
const MAX_HISTORY = 300;
const ROOM_TTL = 12 * 60 * 60 * 1000; // un salon sans connexion est supprimé après 12 h

const rooms = new Map();

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
  message.to === 'all' || message.from === who || message.to === who;

const touch = (room) => { room.lastSeen = Date.now(); };

const handlers = {
  // Le Conteur crée un salon, ou reprend le sien après un rechargement
  host(ws, msg) {
    let room = rooms.get(msg.room);
    if (!room || room.token !== msg.token) {
      room = { code: newCode(), token: randomUUID(), host: null, players: new Map(), state: null, chat: [], lastSeen: Date.now() };
      rooms.set(room.code, room);
    }
    if (room.host && room.host !== ws) room.host.close(4000, 'replaced');
    room.host = ws;
    ws.session = { room, role: 'host' };
    send(ws, { t: 'hosted', room: room.code, token: room.token });
    send(ws, { t: 'history', messages: room.chat });
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
    }

    const player = room.players.get(key);
    if (player.ws && player.ws !== ws) player.ws.close(4000, 'replaced');
    player.ws = ws;
    ws.session = { room, role: 'player', key };
    send(ws, { t: 'joined', room: room.code, key, name: player.name });
    send(ws, { t: 'history', messages: room.chat.filter((m) => canSee(m, key)) });
    sendView(room, key);
    sendRoster(room);
  },

  // Le Conteur publie l'état public et la vue de chaque joueur
  state(ws, msg) {
    const { room, role } = ws.session ?? {};
    if (role !== 'host') return;
    room.state = { public: msg.public, views: msg.views ?? {}, hostNow: Number(msg.hostNow) || Date.now(), receivedAt: Date.now() };
    for (const key of room.players.keys()) sendView(room, key);
  },

  // Le Conteur retire un joueur du cercle
  kick(ws, msg) {
    const { room, role } = ws.session ?? {};
    if (role !== 'host') return;
    const player = room.players.get(msg.key);
    if (!player) return;
    room.players.delete(msg.key);
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
      message = { from: 'host', name: 'Conteur', to, text };
    } else {
      // Un joueur parle à tous quand la discussion est ouverte (le jour), ou au Conteur en privé
      const to = msg.to === 'all' ? 'all' : 'host';
      if (to === 'all' && !room.state?.public.chatOpen) return send(ws, { t: 'error', code: 'chat-closed' });
      message = { from: key, name: room.players.get(key).name, to, text };
    }
    message.id = randomUUID();
    message.ts = Date.now();
    room.chat.push(message);
    if (room.chat.length > MAX_HISTORY) room.chat.shift();

    send(room.host, { t: 'chat', message });
    for (const [playerKey, player] of room.players) {
      if (canSee(message, playerKey)) send(player.ws, { t: 'chat', message });
    }
  },

  // Un joueur désigne les cibles de sa capacité ; le Conteur valide
  targets(ws, msg) {
    const { room, role, key } = ws.session ?? {};
    if (role !== 'player' || !Array.isArray(msg.ids)) return;
    send(room.host, { t: 'targets', key, ids: msg.ids.slice(0, 2) });
  },

  // Nomination ou vote d'un joueur, transmis au Conteur qui tient les comptes
  act(ws, msg) {
    const { room, role, key } = ws.session ?? {};
    if (role !== 'player' || !['nominate', 'vote'].includes(msg.kind)) return;
    send(room.host, { t: 'act', key, kind: msg.kind, id: msg.id, value: msg.value === true });
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
export const attachRelay = (httpServer) => {
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
      if (!connected && Date.now() - room.lastSeen > ROOM_TTL) rooms.delete(code);
    }
  }, 10 * 60 * 1000);
  sweep.unref();
  httpServer.on('close', () => {
    clearInterval(sweep);
    wss.close();
  });

  return wss;
};
