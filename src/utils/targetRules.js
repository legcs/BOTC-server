import { canUseAbility } from './gameLogic';
import { seenCategory } from './roleUtils';

// Lavandière, Libraire, Enquêteur : le Conteur montre deux joueurs, dont l'un a le rôle annoncé
const STARTING_INFO = {
  washerwoman: { category: 'townsfolk', label: 'un Villageois' },
  librarian: { category: 'outsider', label: 'un Étranger' },
  investigator: { category: 'minion', label: 'un Sbire' },
};

// Raison pour laquelle les cibles choisies ne conviennent pas (null si elles conviennent)
export const getTargetError = (role, targets, actor) => {
  const rule = STARTING_INFO[role];
  if (!rule || targets.length < 2) return null;
  if (targets.some(t => t.id === actor?.id)) return 'Montrez deux autres joueurs que lui-même.';
  // Empoisonné ou ivre, il reçoit une information fausse : n'importe quels joueurs conviennent
  if (!canUseAbility(actor)) return null;
  if (!targets.some(t => seenCategory(t) === rule.category)) return `L'un des deux joueurs doit être ${rule.label}.`;
  return null;
};

// Le Libraire apprend directement « 0 » quand aucun Étranger n'est en jeu
export const knowsWithoutTargets = (role, players, actor) =>
  role === 'librarian' && canUseAbility(actor) && !players.some(p => seenCategory(p) === 'outsider');
