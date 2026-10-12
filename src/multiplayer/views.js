import { roles } from '../data/roles';
import { getRoleCategory, isEvilRole } from '../utils/roleUtils';
import { butlerMaster, canBeNominated, canNominate, canVote, canVoteYes, openNomination, voteSummary } from './voting';

// Rôles dont le résultat de la capacité est une information destinée au joueur
export const INFO_ROLES = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'ravenkeeper'];

// Le Démon d'origine garde le rôle interne 'dead' après une succession
const realRole = (player) => (player.role === 'dead' ? 'imp' : player.role);

// Le Soûlard ne sait pas qu'il l'est : il voit le rôle de Villageois qu'on lui a attribué
const believedRole = (player) => (player.role === 'drunk' ? player.shownRole ?? 'drunk' : realRole(player));

const isEvil = (player) => isEvilRole(realRole(player));

// Un joueur ne doit pas pouvoir déduire qu'il est empoisonné ou ivre
const sanitize = (text) => text.replace(/\s*\((?:empoisonn|ivre)[^)]*\)/gi, '').trim();

// Règle officielle : à moins de 7 joueurs, les Sbires et le Démon ne se connaissent pas
// et le Démon ne reçoit pas de bluffs
export const EVIL_INFO_MIN_PLAYERS = 7;
export const evilInfoApplies = (players) => players.length >= EVIL_INFO_MIN_PLAYERS;

export const isMinion = (player) => getRoleCategory(player.role) === 'minion';

// Trois rôles gentils absents de la partie, que le Démon peut prétendre avoir
// (ou conseiller à ses Sbires)
export const pickDemonBluffs = (players, shuffle) => {
  if (!evilInfoApplies(players)) return [];
  const inPlay = new Set(players.flatMap((p) => [p.role, p.shownRole]));
  const absent = [...roles.townsfolk, ...roles.outsiders].filter((r) => r.id !== 'unknown' && !inPlay.has(r.id));
  return shuffle(absent).slice(0, 3).map((r) => r.id);
};

// Les morts de la nuit ne sont annoncées qu'au lever du jour
const publiclyAlive = (player, game) => {
  if (game.gameEnd || game.currentTime === 'JOUR') return player.alive;
  return !game.deadAtNightStart.includes(player.id);
};

// Déroulement de la journée : débat chronométré, puis nominations et votes
const buildDay = (game) => {
  const { day } = game;
  if (!day || game.currentTime !== 'JOUR') return null;
  const open = openNomination(day);
  const summary = voteSummary(day, game.players);
  return {
    phase: day.phase,
    endsAt: day.endsAt,
    threshold: summary.threshold,
    onBlockId: summary.onBlockId,
    results: summary.results,
    // Pendant le vote, on voit qui a voté mais pas quoi : les voix sont révélées à la clôture
    open: open ? {
      id: open.id,
      nominatorId: open.nominatorId,
      nomineeId: open.nomineeId,
      voted: Object.keys(open.votes).map(Number),
      voters: game.players.filter(canVote).length,
    } : null,
  };
};

const buildBallot = (player, game) => {
  const { day } = game;
  if (!day || game.currentTime !== 'JOUR' || game.gameEnd) return null;
  const open = openNomination(day);
  const master = butlerMaster(player, game.players);
  return {
    nominees: canNominate(player, day) ? game.players.filter((p) => canBeNominated(p, day)).map((p) => p.id) : [],
    canVote: !!open && canVote(player) && !(player.id in open.votes),
    // Le Majordome suit le vote de son Maître, qu'il est le seul à voir avant la clôture
    canVoteYes: !open || canVoteYes(player, game.players, open),
    master: master ? { id: master.id, vote: open && master.id in open.votes ? open.votes[master.id] : null } : null,
    myVote: open && player.id in open.votes ? open.votes[player.id] : null,
    ghost: player.alive ? null : (player.ghostUsed ? 'used' : 'available'),
  };
};

const buildPublic = (game) => ({
  phase: game.currentTime,
  night: game.currentNight,
  rolesAssigned: game.roleAssigned,
  joinOpen: game.joinOpen,
  // On discute le jour ; la nuit, le village dort
  chatOpen: !game.roleAssigned || game.currentTime === 'JOUR' || !!game.gameEnd,
  gameEnd: game.gameEnd ? { winner: game.gameEnd.winner, reason: game.gameEnd.reason } : null,
  day: buildDay(game),
  players: game.players.map((p) => {
    const alive = publiclyAlive(p, game);
    // Le jeton de vote des morts est visible de tous
    return { id: p.id, name: p.name, alive, ...(alive ? {} : { ghostUsed: !!p.ghostUsed }) };
  }),
});

const buildPrompt = (player, game) => {
  const { activeAction, actorId, selectedTargets } = game;
  if (!activeAction || actorId !== player.id) return null;
  // Lavandière, Libraire, Enquêteur : le Conteur désigne lui-même les deux joueurs
  if (activeAction.type === 'select_two_info') return null;
  const notSelf = ['select_one_not_self', 'select_one_master'].includes(activeAction.type);
  return {
    action: activeAction.action,
    count: activeAction.type.includes('two') ? 2 : 1,
    // N'importe quel joueur peut être désigné, vivant ou mort
    selectable: game.players.filter((p) => !(notSelf && p.id === player.id)).map((p) => p.id),
    chosen: selectedTargets,
  };
};

// Ce qu'un joueur a le droit de voir, selon son rôle
const buildView = (player, game) => {
  const evil = isEvil(player);
  const demon = realRole(player) === 'imp' && player.alive;
  // L'Espion voit le grimoire tel qu'il était lors de sa dernière consultation nocturne
  const grimoire = player.role === 'spy' && !game.gameEnd ? game.spyGrimoire : null;
  // Information des maléfiques : apprise la première nuit, elle n'est pas mise à jour ensuite
  // (une succession du Démon reste secrète pour les autres Sbires)
  const evilInfo = game.evilInfo ?? (evilInfoApplies(game.players) ? {
    demonId: game.players.find((p) => p.role === 'imp')?.id ?? null,
    minionIds: game.players.filter(isMinion).map((p) => p.id),
  } : null);
  const informed = !!evilInfo && (evilInfo.demonId === player.id || evilInfo.minionIds.includes(player.id));
  const known = {};

  if (game.roleAssigned) {
    for (const other of game.players) {
      if (game.gameEnd) {
        known[other.id] = { role: realRole(other) };
      } else if (grimoire?.players[other.id]) {
        known[other.id] = grimoire.players[other.id];
      } else if (other.id === player.id) {
        known[other.id] = { role: believedRole(other) };
      } else if (informed && other.id === evilInfo.demonId) {
        known[other.id] = { role: 'imp' };
      } else if (informed && evilInfo.minionIds.includes(other.id)) {
        // On sait qui est Sbire, pas quel Sbire
        known[other.id] = { team: 'minion' };
      }
    }
  }

  return {
    id: player.id,
    name: player.name,
    role: game.roleAssigned ? (game.gameEnd ? realRole(player) : believedRole(player)) : null,
    team: game.roleAssigned ? (evil ? 'evil' : 'good') : null,
    known,
    grimoire: grimoire ? { night: grimoire.night } : null,
    bluffs: demon ? game.demonBluffs : [],
    // Le Démon choisit quels bluffs il transmet à quels Sbires
    minions: demon ? game.players.filter(isMinion).map((p) => p.id) : [],
    bluffShares: demon ? game.bluffShares : {},
    sharedBluffs: isMinion(player)
      ? game.demonBluffs.filter((role) => game.bluffShares[role]?.includes(player.id))
      : [],
    infos: game.nightLog.flatMap((night) => night.events
      .filter((event) => event.to === player.id)
      .map((event) => ({ night: night.night, time: event.time, text: sanitize(event.text) }))),
    prompt: buildPrompt(player, game),
    ballot: buildBallot(player, game),
  };
};

// État envoyé au relais : la partie publique, et une vue par joueur connecté
export const buildRelayState = (game) => ({
  public: buildPublic(game),
  views: Object.fromEntries(game.players.filter((p) => p.key).map((p) => [p.key, buildView(p, game)])),
});

export const categoryLabel = (roleId) => ({
  townsfolk: 'Villageois', outsider: 'Étranger', minion: 'Sbire', demon: 'Démon',
}[getRoleCategory(roleId)] ?? '');
