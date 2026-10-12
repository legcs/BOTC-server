import { canUseAbility } from '../../utils/gameLogic';
import { seenRole } from '../../utils/roleUtils';

export const handleSlayerAction = ({ targets, actor, addNightEvent, actionKey, setPlayers }) => {
  const target = targets[0];
  if (!target || !actor) return;

  if (actor.used) {
    addNightEvent(`🏹 Le Mercenaire a déjà utilisé sa capacité`, actionKey);
    return;
  }

  // Un Ermite vu comme Démon meurt aussi, mais la partie continue
  const kills = target.alive && seenRole(target) === 'imp' && canUseAbility(actor);
  setPlayers(prev => prev.map(p => {
    if (p.id === actor.id) return { ...p, used: true, ...(kills && p.id === target.id ? { alive: false } : {}) };
    if (kills && p.id === target.id) return { ...p, alive: false };
    return p;
  }));

  if (!kills) {
    addNightEvent(`🏹 Le Mercenaire tire sur ${target.name} : rien ne se passe`, actionKey);
  } else if (target.role === 'imp') {
    addNightEvent(`🏹 Le Mercenaire tire sur ${target.name} : le Démon meurt !`, actionKey);
  } else {
    addNightEvent(`🏹 Le Mercenaire tire sur ${target.name} (Ermite vu comme Démon) : il meurt, la partie continue`, actionKey);
  }
};
