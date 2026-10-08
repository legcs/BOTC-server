import { canUseAbility } from '../../utils/gameLogic';
import { isEvilRole } from '../../utils/roleUtils';

export const handleChefAction = ({ players, actor, addNightEvent, actionKey }) => {
  if (!canUseAbility(actor)) {
    const randomPairs = Math.floor(Math.random() * 3); // 0 à 2
    addNightEvent(`👨‍🍳 Le Chef (empoisonné/ivre) détecte ${randomPairs} paire(s) maléfique(s) [FAUX]`, actionKey);
    return;
  }

  let evilPairs = 0;
  for (let i = 0; i < players.length; i++) {
    const current = players[i];
    const next = players[(i + 1) % players.length];
    if (isEvilRole(current.role) && isEvilRole(next.role)) {
      evilPairs++;
    }
  }
  addNightEvent(`👨‍🍳 Le Chef détecte ${evilPairs} paire(s) maléfique(s) voisine(s)`, actionKey);
};
