import { canUseAbility, virginTriggers } from '../../utils/gameLogic';
import { askRegistration, townsfolkQuestion } from './storyteller';

// Le Conteur désigne le joueur qui vient de nominer la Vierge
export const handleVirginAction = ({ targets, players, actor, addNightEvent, actionKey, setPlayers, executePlayer, ask }) => {
  const nominator = targets[0];
  if (!nominator || !actor) return;

  if (actor.used) {
    addNightEvent(`🕊️ La Vierge a déjà été nominée : sa capacité est épuisée`, actionKey);
    return;
  }

  const resolve = (seen) => {
    // La capacité est dépensée à la première nomination, qu'elle fasse effet ou non
    const triggers = virginTriggers(actor, seen.find(p => p.id === nominator.id));
    setPlayers(prev => prev.map(p => (p.id === actor.id ? { ...p, used: true } : p)));
    if (triggers) {
      addNightEvent(`🕊️ ${nominator.name} nomine la Vierge : Villageois, il est exécuté sur-le-champ`, actionKey);
      executePlayer(nominator.id);
    } else {
      addNightEvent(`🕊️ ${nominator.name} nomine la Vierge : rien ne se passe`, actionKey);
    }
  };

  // Un Espion peut être vu comme un Villageois
  const decides = nominator.role === 'spy' && actor.role === 'virgin' && canUseAbility(actor);
  askRegistration(ask, players, decides ? [townsfolkQuestion(nominator)] : [], resolve);
};
