import { virginTriggers } from '../../utils/gameLogic';

// Le Conteur désigne le joueur qui vient de nominer la Vierge
export const handleVirginAction = ({ targets, actor, addNightEvent, actionKey, setPlayers, executePlayer }) => {
  const nominator = targets[0];
  if (!nominator || !actor) return;

  if (actor.used) {
    addNightEvent(`🕊️ La Vierge a déjà été nominée : sa capacité est épuisée`, actionKey);
    return;
  }

  // La capacité est dépensée à la première nomination, qu'elle fasse effet ou non
  const triggers = virginTriggers(actor, nominator);
  setPlayers(prev => prev.map(p => (p.id === actor.id ? { ...p, used: true } : p)));
  if (triggers) {
    addNightEvent(`🕊️ ${nominator.name} nomine la Vierge : Villageois, il est exécuté sur-le-champ`, actionKey);
    executePlayer(nominator.id);
  } else {
    addNightEvent(`🕊️ ${nominator.name} nomine la Vierge : rien ne se passe`, actionKey);
  }
};
