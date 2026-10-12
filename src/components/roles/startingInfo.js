import { canUseAbility, pickRandom, shuffleArray } from '../../utils/gameLogic';
import { getRoleName, seenCategory, seenRole } from '../../utils/roleUtils';

// Lavandière, Libraire, Enquêteur : le Conteur désigne deux joueurs, et le joueur apprend
// que l'un des deux a un rôle précis, sans savoir lequel.
export const startingInfoHandler = ({ icon, label, impaired, category, pool, noneText }) =>
  ({ targets, players, actor, addNightEvent, actionKey }) => {
    if (targets.length !== 2) {
      // Aucun joueur de cette catégorie en jeu : il l'apprend directement
      if (noneText && canUseAbility(actor) && !players.some(p => seenCategory(p) === category)) {
        addNightEvent(`${icon} ${label} apprend ${noneText}`, actionKey);
      }
      return;
    }

    // Ordre mélangé : rien n'indique lequel des deux a le rôle
    const [first, second] = shuffleArray(targets);

    if (!canUseAbility(actor)) {
      addNightEvent(
        `${icon} ${label} ${impaired} apprend que ${first.name} ou ${second.name} est ${pickRandom(pool).name} [FAUX]`,
        actionKey
      );
      return;
    }

    const matches = targets.filter(t => seenCategory(t) === category && t.id !== actor?.id);
    if (matches.length === 0) return;
    addNightEvent(
      `${icon} ${label} apprend que ${first.name} ou ${second.name} est ${getRoleName(seenRole(pickRandom(matches)))}`,
      actionKey
    );
  };
