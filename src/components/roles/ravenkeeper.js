import { playableRoles } from '../../data/roles';
import { canUseAbility, pickRandom } from '../../utils/gameLogic';
import { getRoleName, seenRole } from '../../utils/roleUtils';

export const handleRavenkeeperAction = ({ targets, actor, addNightEvent, actionKey }) => {
  const target = targets[0];
  if (!target) return;

  if (!canUseAbility(actor)) {
    addNightEvent(
      `🐦‍⬛ Le Gardien (empoisonné/ivre) apprend que ${target.name} est ${pickRandom(playableRoles).name} [FAUX]`,
      actionKey
    );
  } else {
    addNightEvent(`🐦‍⬛ Le Gardien apprend que ${target.name} est ${getRoleName(seenRole(target))}`, actionKey);
  }
};
