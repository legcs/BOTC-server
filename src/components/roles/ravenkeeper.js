import { canUseAbility } from '../../utils/gameLogic';
import { getRoleName, seenRole } from '../../utils/roleUtils';
import { askRegistration, inform, isAmbiguous, roleOptions, roleQuestion } from './storyteller';

export const handleRavenkeeperAction = (ctx) => {
  const { targets, players, actor, ask } = ctx;
  const target = targets[0];
  if (!target) return;

  const deliver = (seen) => inform(ctx, {
    truth: seenRole(seen.find(p => p.id === target.id)),
    options: roleOptions(),
    describe: (role, tag) => `🐦‍⬛ Le Gardien${tag} apprend que ${target.name} est ${getRoleName(role)}`,
  });

  if (!canUseAbility(actor)) {
    deliver(players);
    return;
  }
  askRegistration(ask, players, isAmbiguous(target) ? [roleQuestion(target)] : [], deliver);
};
