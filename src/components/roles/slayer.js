import { canUseAbility } from '../../utils/gameLogic';

export const handleSlayerAction = ({ targets, actor, addNightEvent, actionKey, setPlayers }) => {
  const target = targets[0];
  if (!target || !actor) return;

  if (actor.used) {
    addNightEvent(`🏹 Le Mercenaire a déjà utilisé sa capacité`, actionKey);
    return;
  }

  const kills = target.role === 'imp' && canUseAbility(actor);
  setPlayers(prev => prev.map(p => {
    if (p.id === actor.id) return { ...p, used: true };
    if (kills && p.id === target.id) return { ...p, alive: false };
    return p;
  }));

  addNightEvent(
    kills
      ? `🏹 Le Mercenaire tire sur ${target.name} : le Démon meurt !`
      : `🏹 Le Mercenaire tire sur ${target.name} : rien ne se passe`,
    actionKey
  );
};
