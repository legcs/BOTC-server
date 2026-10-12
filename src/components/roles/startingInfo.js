import { canUseAbility, shuffleArray } from '../../utils/gameLogic';
import { getRoleCategory, getRoleName, seenCategory, seenRole } from '../../utils/roleUtils';
import { askRegistration, categoryQuestion, inform, isAmbiguous, roleOptions } from './storyteller';

const NONE = 'none';

// Lavandière, Libraire, Enquêteur : le Conteur désigne deux joueurs, et le joueur apprend
// que l'un des deux a un rôle précis, sans savoir lequel.
export const startingInfoHandler = ({ icon, label, impaired, category, pool, noneText }) => (ctx) => {
  const { targets, players, actor, ask } = ctx;
  const sober = canUseAbility(actor);
  const describeNone = (tag) => `${icon} ${label}${tag} apprend ${noneText}`;

  if (targets.length !== 2) {
    // Aucun joueur de cette catégorie en jeu : il l'apprend directement
    if (noneText && sober && !players.some(p => seenCategory(p) === category)) {
      ctx.addNightEvent(describeNone(''), ctx.actionKey);
    }
    return;
  }

  // Ordre mélangé : rien n'indique lequel des deux a le rôle
  const [first, second] = shuffleArray(targets);
  const ids = targets.map(t => t.id);
  const shownRole = (seen) => {
    const match = seen.find(p => ids.includes(p.id) && p.id !== actor?.id && seenCategory(p) === category);
    return match ? seenRole(match) : null;
  };
  const deliver = (seen) => inform(ctx, {
    truth: shownRole(seen),
    options: [...roleOptions(pool), ...(noneText ? [{ label: 'Aucun en jeu (0)', value: NONE }] : [])],
    impaired,
    describe: (role, tag) => (role === NONE
      ? describeNone(tag)
      : `${icon} ${label}${tag} apprend que ${first.name} ou ${second.name} est ${getRoleName(role)}`),
  });

  if (!sober || shownRole(players)) {
    deliver(players);
    return;
  }
  // Aucun des deux n'a réellement ce type de rôle : un Ermite ou un Espion passe pour l'avoir
  const disguised = targets.find(t => isAmbiguous(t) && getRoleCategory(t.role) !== category);
  if (!disguised) return;
  askRegistration(ask, players, [categoryQuestion(disguised, pool)], deliver);
};
