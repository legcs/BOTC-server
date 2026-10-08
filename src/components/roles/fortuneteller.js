import { canUseAbility } from '../../utils/gameLogic';

export const handleFortuneTellerAction = ({ targets, actor, addNightEvent, actionKey }) => {
  if (targets.length !== 2) return;

  if (!canUseAbility(actor)) {
    // Donner une fausse information
    const randomResult = Math.random() > 0.5;
    addNightEvent(
      `🔮 Voyante (empoisonnée/ivre) vérifie ${targets[0].name} et ${targets[1].name}: ${randomResult ? 'Il y a un démon' : "Il n'y a pas de démon"} [FAUX]`,
      actionKey
    );
  } else {
    // Le Leurre est détecté comme un Démon
    const result = targets.some(t => t.role === 'imp' || t.decoy);
    addNightEvent(
      `🔮 Voyante vérifie ${targets[0].name} et ${targets[1].name}: ${result ? 'Il y a un démon' : "Il n'y a pas de démon"}`,
      actionKey
    );
  }
};
