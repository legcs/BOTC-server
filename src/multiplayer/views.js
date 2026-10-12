import { roles } from '../data/roles';
import { getRoleCategory, isEvilRole } from '../utils/roleUtils';
import { canBeNominated, canNominate, canVote, openNomination, voteSummary } from './voting';

// Rôles dont le résultat de la capacité est une information destinée au joueur
export const INFO_ROLES = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortuneteller', 'undertaker', 'ravenkeeper'];

// Le Démon d'origine garde le rôle interne 'dead' après une succession
const realRole = (player) => (player.role === 'dead' ? 'imp' : player.role);

// Le Soûlard ne sait pas qu'il l'est : il voit le rôle de Villageois qu'on lui a attribué
const believedRole = (player) => (player.role === 'drunk' ? player.shownRole ?? 'drunk' : realRole(player));

const isEvil = (player) => isEvilRole(realRole(player));

// Un joueur ne doit pas pouvoir déduire qu'il est empoisonné ou ivre
const sanitize = (text) => text.replace(/\s*\((?:empoisonn|ivre)[^)]*\)/gi, '').trim();

// Trois rôles gentils absents de la partie, que le Démon peut prétendre avoir
export const pickDemonBluffs = (players, shuffle) => {
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
  return {
    nominees: canNominate(player, day) ? game.players.filter((p) => canBeNominated(p, day)).map((p) => p.id) : [],
    canVote: !!open && canVote(player) && !(player.id in open.votes),
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
  players: game.players.map((p) => ({ id: p.id, name: p.name, alive: publiclyAlive(p, game) })),
});

const buildPrompt = (player, game) => {
  const { activeAction, actorId, selectedTargets } = game;
  if (!activeAction || actorId !== player.id) return null;
  return {
    action: activeAction.action,
    count: activeAction.type.includes('two') ? 2 : 1,
    selectable: game.players
      .filter((p) => publiclyAlive(p, game) && !(activeAction.type === 'select_one_not_self' && p.id === player.id))
      .map((p) => p.id),
    chosen: selectedTargets,
  };
};

// Ce qu'un joueur a le droit de voir, selon son rôle
const buildView = (player, game) => {
  const evil = isEvil(player);
  const spy = player.role === 'spy';
  const known = {};

  if (game.roleAssigned) {
    for (const other of game.players) {
      if (game.gameEnd || spy) {
        // L'Espion consulte le grimoire : tous les rôles et leurs statuts
        known[other.id] = {
          role: other.role === 'dead' ? 'imp' : other.role,
          ...(spy && !game.gameEnd ? {
            poisoned: other.poisoned, ivre: other.ivre || other.role === 'drunk', protected: other.protected,
            decoy: other.decoy, master: other.master,
          } : {}),
        };
      } else if (other.id === player.id) {
        known[other.id] = { role: believedRole(other) };
      } else if (evil && isEvil(other)) {
        // Les Sbires et le Démon se connaissent
        known[other.id] = { role: realRole(other) };
      }
    }
  }

  return {
    id: player.id,
    name: player.name,
    role: game.roleAssigned ? (game.gameEnd || spy ? realRole(player) : believedRole(player)) : null,
    team: game.roleAssigned ? (evil ? 'evil' : 'good') : null,
    known,
    grimoire: spy && !game.gameEnd,
    bluffs: realRole(player) === 'imp' && player.alive ? game.demonBluffs : [],
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
