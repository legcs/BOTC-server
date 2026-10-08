import { roles } from '../../data/roles';
import { canUseAbility, pickRandom } from '../../utils/gameLogic';
import { getRoleCategory, getRoleName } from '../../utils/roleUtils';

export const handleWasherwomanAction = ({ targets, actor, addNightEvent, actionKey }) => {
  if (targets.length !== 2) return;

  if (!canUseAbility(actor)) {
    // Donner une fausse information
    const randomTarget = pickRandom(targets);
    const randomRole = pickRandom(roles.townsfolk.filter(r => r.id !== 'unknown'));
    addNightEvent(
      `🧺 Lavandière (empoisonnée/ivre) apprend que ${randomTarget.name} est ${randomRole.name} [FAUX]`,
      actionKey
    );
    return;
  }

  const matches = targets.filter(t => getRoleCategory(t.role) === 'townsfolk');
  if (matches.length > 0) {
    const chosen = pickRandom(matches);
    addNightEvent(`🧺 Lavandière apprend que ${chosen.name} est ${getRoleName(chosen.role)}`, actionKey);
  } else {
    addNightEvent(`🧺 Lavandière: Aucun Villageois parmi ${targets[0].name} et ${targets[1].name}`, actionKey);
  }
};
