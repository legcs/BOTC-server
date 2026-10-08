export const handlePoisonerAction = ({ targets, addNightEvent, actionKey, setPlayers }) => {
  const target = targets[0];
  if (!target) return;

  // Un seul joueur empoisonné à la fois
  setPlayers(prev => prev.map(p => ({ ...p, poisoned: p.id === target.id })));
  addNightEvent(`☠️ ${target.name} a été empoisonné`, actionKey);
};
