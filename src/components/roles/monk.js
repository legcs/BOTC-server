import { canUseAbility } from '../../utils/gameLogic';

export const handleMonkAction = ({ targets, actor, addNightEvent, actionKey, setPlayers }) => {
  const target = targets[0];
  if (!target) return;

  if (!canUseAbility(actor)) {
    addNightEvent(`🙏 Le Moine (empoisonné/ivre) choisit ${target.name} - sa capacité ne fonctionne pas`, actionKey);
  } else {
    setPlayers(prev => prev.map(p => ({ ...p, protected: p.id === target.id })));
    addNightEvent(`🛡️ ${target.name} est protégé par le Moine`, actionKey);
  }
};
