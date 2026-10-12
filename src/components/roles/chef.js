import { canUseAbility } from '../../utils/gameLogic';
import { seenAsEvil } from '../../utils/roleUtils';
import { alignmentQuestion, askRegistration, inform, isAmbiguous } from './storyteller';

const countPairs = (players) => players.filter((p, i) => seenAsEvil(p) && seenAsEvil(players[(i + 1) % players.length])).length;

export const handleChefAction = (ctx) => {
  const { players, actor, ask } = ctx;
  const deliver = (seen) => inform(ctx, {
    truth: countPairs(seen),
    options: [0, 1, 2, 3].map(n => ({ label: `${n} paire(s)`, value: n })),
    describe: (pairs, tag) => `👨‍🍳 Le Chef${tag} détecte ${pairs} paire(s) maléfique(s) voisine(s)`,
  });

  if (!canUseAbility(actor)) {
    deliver(players);
    return;
  }
  // Un Ermite ou un Espion compte selon la façon dont le Conteur le fait voir
  askRegistration(ask, players, players.filter(isAmbiguous).map(alignmentQuestion), deliver);
};
