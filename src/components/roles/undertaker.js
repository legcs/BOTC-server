import { canUseAbility } from '../../utils/gameLogic';
import { getRoleName, seenRole } from '../../utils/roleUtils';
import { askRegistration, inform, isAmbiguous, roleOptions, roleQuestion } from './storyteller';

export const handleUndertakerAction = (ctx) => {
  const { players, actor, lastExecutedPlayerId, addNightEvent, actionKey, ask } = ctx;
  const executed = players.find(p => p.id === lastExecutedPlayerId);
  if (!executed) {
    addNightEvent(`⚰️ Le Croque-mort n'apprend rien : personne n'a été exécuté aujourd'hui`, actionKey);
    return;
  }

  const deliver = (seen) => inform(ctx, {
    truth: seenRole(seen.find(p => p.id === executed.id)),
    options: roleOptions(),
    describe: (role, tag) => `⚰️ Le Croque-mort${tag} apprend que ${executed.name} était ${getRoleName(role)}`,
  });

  if (!canUseAbility(actor)) {
    deliver(players);
    return;
  }
  askRegistration(ask, players, isAmbiguous(executed) ? [roleQuestion(executed)] : [], deliver);
};
