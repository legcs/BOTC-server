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
  ask,
}) => {
  const target = targets[0];
  if (!target || !actor) return;

  if (!canUseAbility(actor)) {
    addNightEvent(`👺 Le Démon (empoisonné) attaque ${target.name} - sans effet`, actionKey);
    return;
  }

  // Attaque d'un joueur, avec les protections qui s'appliquent à lui
  const strike = (victim) => {
    if (!victim.alive) {
      addNightEvent(`👺 Le Démon attaque ${victim.name}, déjà mort : aucun mort cette nuit`, actionKey);
      return;
    }

    // La protection du Moine vaut aussi quand le Démon se vise lui-même
    if (victim.protected) {
      addNightEvent(`🛡️ ${victim.name} était protégé ! Aucun mort cette nuit.`, actionKey);
      return;
    }

    if (victim.id === actor.id) {
      impSuicide({ players, actor, addNightEvent, actionKey, setPlayers });
      return;
    }

    // Le Soldat empoisonné/ivre peut être tué
    if (victim.role === 'soldier' && canUseAbility(victim)) {
      addNightEvent(`🛡️ ${victim.name} (Soldat) résiste à l'attaque du Démon !`, actionKey);
      return;
    }

    setPlayers(prev => prev.map(p => (p.id === victim.id ? { ...p, alive: false } : p)));
    onNightDeath(victim.id);
    addNightEvent(`👺 ${victim.name} a été tué par le Démon`, actionKey);
  };

  // Le Maire visé de nuit : le Conteur peut faire mourir un autre joueur à sa place
  if (target.role === 'mayor' && target.alive && !target.protected && canUseAbility(target) && ask) {
    ask({
      title: `Le Démon attaque ${target.name} (Maire)`,
      text: 'Si le Maire doit mourir la nuit, un autre joueur peut mourir à sa place.',
      options: [
        { label: 'Le Maire meurt', run: () => strike(target) },
        ...players
          .filter(p => p.alive && p.id !== target.id && p.id !== actor.id)
          .map(p => ({ label: `${p.name} meurt à sa place`, run: () => strike(p) })),
      ],
    });
    return;
  }

  strike(target);
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
