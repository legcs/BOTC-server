import { canUseAbility } from '../../utils/gameLogic';
import { seenAsEvil } from '../../utils/roleUtils';
import { alignmentQuestion, askRegistration, inform, isAmbiguous } from './storyteller';

// Premier joueur vivant en partant de l'Empathe dans un sens donné (les morts sont ignorés)
const findAliveNeighbor = (players, fromIndex, step) => {
  for (let offset = 1; offset < players.length; offset++) {
    const candidate = players[(fromIndex + step * offset + players.length * offset) % players.length];
    if (candidate.alive) return candidate;
  }
  return null;
};

const neighborsOf = (players, actor) => {
  const index = players.findIndex(p => p.id === actor.id);
  const left = findAliveNeighbor(players, index, -1);
  const right = findAliveNeighbor(players, index, 1);
  // À 2 joueurs vivants, le même voisin est trouvé des deux côtés
  return left && right && left.id === right.id ? [left] : [left, right].filter(Boolean);
};

export const handleEmpathAction = (ctx) => {
  const { players, actor, ask } = ctx;
  if (!actor) return;

  const deliver = (seen) => inform(ctx, {
    truth: neighborsOf(seen, actor).filter(seenAsEvil).length,
    options: [0, 1, 2].map(n => ({ label: `${n} voisin(s) maléfique(s)`, value: n })),
    describe: (count, tag) => `🫶 L'Empathe${tag} détecte ${count} voisin(s) maléfique(s)`,
  });

  if (!canUseAbility(actor)) {
    deliver(players);
    return;
  }
  askRegistration(ask, players, neighborsOf(players, actor).filter(isAmbiguous).map(alignmentQuestion), deliver);
};
