import { canUseAbility } from '../../utils/gameLogic';
import { seenAsEvil } from '../../utils/roleUtils';

// Premier joueur vivant en partant de l'Empathe dans un sens donné (les morts sont ignorés)
const findAliveNeighbor = (players, fromIndex, step) => {
  for (let offset = 1; offset < players.length; offset++) {
    const candidate = players[(fromIndex + step * offset + players.length * offset) % players.length];
    if (candidate.alive) return candidate;
  }
  return null;
};

export const handleEmpathAction = ({ players, actor, addNightEvent, actionKey }) => {
  if (!actor) return;

  if (!canUseAbility(actor)) {
    const randomCount = Math.floor(Math.random() * 3); // 0, 1, ou 2
    addNightEvent(`🫶 L'Empathe (empoisonné/ivre) détecte ${randomCount} voisin(s) maléfique(s) [FAUX]`, actionKey);
    return;
  }

  const empathIndex = players.findIndex(p => p.id === actor.id);
  const left = findAliveNeighbor(players, empathIndex, -1);
  const right = findAliveNeighbor(players, empathIndex, 1);
  // À 2 joueurs vivants, le même voisin est trouvé des deux côtés
  const neighbors = left && right && left.id === right.id ? [left] : [left, right].filter(Boolean);
  const evilCount = neighbors.filter(seenAsEvil).length;

  addNightEvent(`🫶 L'Empathe détecte ${evilCount} voisin(s) maléfique(s)`, actionKey);
};
