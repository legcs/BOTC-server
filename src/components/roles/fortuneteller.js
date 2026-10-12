import { canUseAbility } from '../../utils/gameLogic';
import { seenRole } from '../../utils/roleUtils';
import { askRegistration, demonQuestion, inform } from './storyteller';

export const handleFortuneTellerAction = (ctx) => {
  const { targets, players, actor, ask } = ctx;
  if (targets.length !== 2) return;

  const ids = targets.map(t => t.id);
  const deliver = (seen) => inform(ctx, {
    // Le Leurre est vu comme un Démon, de même qu'un Démon mort ou un Ermite vu comme Démon
    truth: seen.filter(p => ids.includes(p.id)).some(t => seenRole(t) === 'imp' || t.decoy),
    options: [{ label: 'OUI, il y a un Démon', value: true }, { label: 'NON, pas de Démon', value: false }],
    impaired: '(empoisonnée/ivre)',
    describe: (yes, tag) => `🔮 Voyante${tag} vérifie ${targets[0].name} et ${targets[1].name}: ${yes ? 'Il y a un démon' : "Il n'y a pas de démon"}`,
  });

  if (!canUseAbility(actor)) {
    deliver(players);
    return;
  }
  askRegistration(ask, players, targets.filter(t => t.role === 'recluse').map(demonQuestion), deliver);
};
