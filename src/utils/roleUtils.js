import { roles, allRoles } from '../data/roles';

export const getRoleCategory = (roleId) => {
  if (roles.townsfolk.find(r => r.id === roleId)) return 'townsfolk';
  if (roles.outsiders.find(r => r.id === roleId)) return 'outsider';
  if (roles.minions.find(r => r.id === roleId)) return 'minion';
  if (roles.demons.find(r => r.id === roleId)) return 'demon';
  return 'unknown';
};

export const isEvilRole = (roleId) => {
  const category = getRoleCategory(roleId);
  return category === 'minion' || category === 'demon';
};

// Un Soûlard tient, à ses yeux, le rôle de Villageois qu'il croit avoir : il est réveillé à sa place
export const holdsRole = (player, roleId) =>
  player.role === roleId || (player.role === 'drunk' && player.shownRole === roleId);

// Rôle sous lequel un joueur est vu par les capacités des autres. L'Ermite peut être vu comme
// Sbire ou Démon, l'Espion comme Villageois ou Étranger : le Conteur en décide à chaque détection
// (`seenAs` est posé le temps de résoudre la capacité, voir components/roles/storyteller.js).
export const seenRole = (player) => {
  if ((player.role === 'recluse' || player.role === 'spy') && player.seenAs) return player.seenAs;
  return player.role === 'dead' ? 'imp' : player.role;
};
export const seenCategory = (player) => getRoleCategory(seenRole(player));
export const seenAsEvil = (player) => isEvilRole(seenRole(player));

// Le Démon d'origine garde le rôle 'dead' après une succession : on l'affiche comme Démon
export const getRoleName = (roleId) => {
  const id = roleId === 'dead' ? 'imp' : roleId;
  return allRoles.find(r => r.id === id)?.name;
};

export const getCategoryColor = (category) => {
  switch (category) {
    case 'townsfolk': return { primary: '#4a9eff', secondary: '#1e3a5f', glow: 'rgba(74, 158, 255, 0.4)' };
    case 'outsider': return { primary: '#00c9a7', secondary: '#0a3d36', glow: 'rgba(0, 201, 167, 0.4)' };
    case 'minion': return { primary: '#ff6b6b', secondary: '#5f1e1e', glow: 'rgba(255, 107, 107, 0.4)' };
    case 'demon': return { primary: '#9d4edd', secondary: '#3d1f5c', glow: 'rgba(157, 78, 221, 0.4)' };
    default: return { primary: '#888', secondary: '#333', glow: 'rgba(136, 136, 136, 0.4)' };
  }
};

export const getActionType = (role) => {
  switch (role) {
    case 'poisoner':
    case 'slayer':
      return 'select_one';
    case 'monk':
    case 'virgin':
      return 'select_one_not_self';
    case 'imp':
      return 'select_one_kill';
    case 'fortuneteller':
      return 'select_two';
    case 'washerwoman':
    case 'librarian':
    case 'investigator':
      return 'select_two_info';
    case 'butler':
      return 'select_one_master';
    case 'ravenkeeper':
      return 'select_one_info';
    case 'empath':
      return 'auto';
    case 'chef':
      return 'auto';
    case 'undertaker':
      return 'auto';
    case 'spy':
      return 'auto';
    default:
      return 'none';
  }
};