import { canUseAbility } from '../../utils/gameLogic';

export const handleButlerAction = ({ targets, actor, addNightEvent, actionKey, setPlayers }) => {
  const target = targets[0];
  if (!target) return;

  // Un seul Maître à la fois
  setPlayers(prev => prev.map(p => ({ ...p, master: p.id === target.id })));
  if (!canUseAbility(actor)) {
    addNightEvent(`🤵 Le Majordome (empoisonné/ivre) choisit ${target.name} - mais cela ne fonctionne pas`, actionKey);
  } else {
    addNightEvent(`🤵 Le Majordome a choisi ${target.name} comme Maître`, actionKey);
  }
};
