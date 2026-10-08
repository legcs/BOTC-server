import { roles } from '../../data/roles';
import { canUseAbility, pickRandom } from '../../utils/gameLogic';
import { getRoleCategory, getRoleName } from '../../utils/roleUtils';

export const handleInvestigatorAction = ({ targets, actor, addNightEvent, actionKey }) => {
  if (targets.length !== 2) return;

  if (!canUseAbility(actor)) {
    // Donner une fausse information
    const randomTarget = pickRandom(targets);
    const randomRole = pickRandom(roles.minions);
    addNightEvent(
      `🔍 Enquêteur (empoisonné/ivre) apprend que ${randomTarget.name} est ${randomRole.name} [FAUX]`,
      actionKey
    );
    return;
  }

  const matches = targets.filter(t => getRoleCategory(t.role) === 'minion');
  if (matches.length > 0) {
    const chosen = pickRandom(matches);
    addNightEvent(`🔍 Enquêteur apprend que ${chosen.name} est ${getRoleName(chosen.role)}`, actionKey);
  } else {
    addNightEvent(`🔍 Enquêteur: Aucun Sbire parmi ${targets[0].name} et ${targets[1].name}`, actionKey);
  }
};
