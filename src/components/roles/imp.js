import { appendNote, canUseAbility, pickRandom } from '../../utils/gameLogic';
import { getRoleCategory } from '../../utils/roleUtils';

export const handleImpAction = ({
  targets,
  players,
  actor,
  addNightEvent,
  actionKey,
  setPlayers,
  onNightDeath,
}) => {
  const target = targets[0];
  if (!target || !actor) return;

  if (!canUseAbility(actor)) {
    addNightEvent(`👺 Le Démon (empoisonné) attaque ${target.name} - sans effet`, actionKey);
    return;
  }

  if (target.id === actor.id) {
    impSuicide({ players, actor, addNightEvent, actionKey, setPlayers });
    return;
  }

  if (target.protected) {
    addNightEvent(`🛡️ ${target.name} était protégé ! Aucun mort cette nuit.`, actionKey);
    return;
  }

  // Le Soldat empoisonné/ivre peut être tué
  if (target.role === 'soldier' && canUseAbility(target)) {
    addNightEvent(`🛡️ ${target.name} (Soldat) résiste à l'attaque du Démon !`, actionKey);
    return;
  }

  setPlayers(prev => prev.map(p => (p.id === target.id ? { ...p, alive: false } : p)));
  onNightDeath(target.id);
  addNightEvent(`👺 ${target.name} a été tué par le Démon`, actionKey);
};

const impSuicide = ({ players, actor, addNightEvent, actionKey, setPlayers }) => {
  const aliveMinions = players.filter(p => p.alive && getRoleCategory(p.role) === 'minion');

  if (aliveMinions.length === 0) {
    // Aucun Sbire pour lui succéder : le Démon meurt, le Village gagne
    setPlayers(prev => prev.map(p => (p.id === actor.id ? { ...p, alive: false } : p)));
    addNightEvent(`💀 Le Démon s'est suicidé sans Sbire pour lui succéder`, actionKey);
    return;
  }

  // La Confidente est prioritaire pour devenir le nouveau Démon
  const heir = aliveMinions.find(p => p.role === 'scarletwoman') || pickRandom(aliveMinions);
  setPlayers(prev => prev.map(p => {
    if (p.id === actor.id) {
      return { ...p, alive: false, role: 'dead', notes: appendNote(p.notes, '[Suicide]') };
    }
    if (p.id === heir.id) {
      return { ...p, role: 'imp', notes: appendNote(p.notes, '[Transformé en Démon suite au suicide du démon]') };
    }
    return p;
  }));
  addNightEvent(`💀 Le Démon s'est suicidé, ${heir.name} devient le nouveau Démon !`, actionKey);
};
