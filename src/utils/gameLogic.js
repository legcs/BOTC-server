import { roles } from '../data/roles';
import { isEvilRole } from './roleUtils';

// Mélange de Fisher-Yates (non biaisé)
export const shuffleArray = (arr) => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const appendNote = (notes, note) => (notes ? `${notes}\n${note}` : note);

export const assignRoles = (players) => {
  if (players.length < 5 || players.length > 15) return players;

  const playerCount = players.length;
  // Répartition officielle pour 5 à 15 joueurs
  const outsiderTable = [0, 1, 0, 1, 2, 0, 1, 2, 0, 1, 2];
  const minionsTable = [1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3];

  let numOutsiders = outsiderTable[playerCount - 5];
  const numMinions = minionsTable[playerCount - 5];
  const numDemons = 1;

  const selectedMinions = shuffleArray(roles.minions).slice(0, numMinions);

  if (selectedMinions.some(minion => minion.id === 'baron')) {
    numOutsiders += 2;
  }

  const numTownsfolk = Math.max(0, playerCount - numOutsiders - numMinions - numDemons);

  const rolePool = shuffleArray([
    ...shuffleArray(roles.townsfolk.filter(role => role.id !== 'unknown')).slice(0, numTownsfolk),
    ...shuffleArray(roles.outsiders).slice(0, numOutsiders),
    ...selectedMinions,
    ...roles.demons.filter(role => role.id !== 'dead').slice(0, numDemons),
  ]);

  const drunkBelief = rolePool.some(role => role.id === 'drunk')
    ? pickRandom(roles.townsfolk.filter(role => role.id !== 'unknown' && !rolePool.includes(role)))
    : null;

  const assigned = players.map((player, index) => ({
    ...player,
    role: rolePool[index]?.id || player.role,
    alive: true,
    executed: false,
    poisoned: false,
    protected: false,
    decoy: false,
    ivre: false,
    master: false,
    used: false,
    ghostUsed: false,
    notes: '',
    // Le Soûlard croit être un Villageois absent de la partie
    shownRole: rolePool[index]?.id === 'drunk' ? drunkBelief?.id ?? null : null,
  }));

  // La Voyante a besoin d'un Leurre : un joueur gentil tiré au hasard (modifiable ensuite)
  if (assigned.some(p => p.role === 'fortuneteller')) {
    const decoy = pickRandom(assigned.filter(p => !isEvilRole(p.role)));
    return assigned.map(p => (p.id === decoy.id ? { ...p, decoy: true } : p));
  }

  return assigned;
};

export const canUseAbility = (player) => {
  if (!player) return false;
  if (player.poisoned || player.ivre) return false;
  return true;
};

// Si le Démon est mort et que la Confidente peut prendre sa place, retourne les joueurs mis à jour.
// Le décompte des 5 joueurs vivants inclut le Démon qui vient de mourir (donc 4 après sa mort).
export const resolveDemonDeath = (players) => {
  const imp = players.find(p => p.role === 'imp');
  if (!imp || imp.alive) return null;

  const scarletwoman = players.find(p => p.role === 'scarletwoman' && p.alive);
  const aliveCount = players.filter(p => p.alive).length;
  if (!scarletwoman || !canUseAbility(scarletwoman) || aliveCount < 4) return null;

  return {
    players: players.map(p => {
      if (p.id === scarletwoman.id) {
        return { ...p, role: 'imp', notes: appendNote(p.notes, '[Transformée en Démon suite à la mort du démon]') };
      }
      if (p.id === imp.id) {
        return { ...p, role: 'dead', notes: appendNote(p.notes, '[Tué]') };
      }
      return p;
    }),
    event: `💋 ${scarletwoman.name} (Confidente) devient le nouveau Démon suite à la mort de celui-ci !`,
  };
};

// Conditions de victoire permanentes. Le Saint et le Maire dépendent de l'exécution
// du jour et sont gérés au moment de l'exécution.
export const getVictory = (players) => {
  const alivePlayers = players.filter(p => p.alive);
  const imp = players.find(p => p.role === 'imp');

  if (imp && !imp.alive) {
    return { winner: 'village', reason: 'Le Démon est mort et la Confidente n\'est pas en jeu ou est morte.' };
  }

  if (imp && alivePlayers.length <= 2) {
    return { winner: 'evil', reason: 'Il ne reste que 2 joueurs dont le Démon.' };
  }

  const aliveEvil = alivePlayers.filter(p => isEvilRole(p.role));
  if (aliveEvil.length === 0 && alivePlayers.length > 0 && players.some(p => isEvilRole(p.role))) {
    return { winner: 'village', reason: 'Tous les joueurs maléfiques sont morts.' };
  }

  return null;
};
