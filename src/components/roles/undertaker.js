import { playableRoles } from '../../data/roles';
import { canUseAbility, pickRandom } from '../../utils/gameLogic';
import { getRoleName, seenRole } from '../../utils/roleUtils';

export const handleUndertakerAction = ({ players, actor, lastExecutedPlayerId, addNightEvent, actionKey }) => {
  const executedPlayer = players.find(p => p.id === lastExecutedPlayerId);
  if (!executedPlayer) {
    addNightEvent(`⚰️ Le Croque-mort n'apprend rien : personne n'a été exécuté aujourd'hui`, actionKey);
    return;
  }

  if (!canUseAbility(actor)) {
    addNightEvent(
      `⚰️ Le Croque-mort (empoisonné/ivre) apprend que ${executedPlayer.name} était ${pickRandom(playableRoles).name} [FAUX]`,
      actionKey
    );
  } else {
    addNightEvent(
      `⚰️ Le Croque-mort apprend que ${executedPlayer.name} était ${getRoleName(seenRole(executedPlayer))}`,
      actionKey
    );
  }
};
