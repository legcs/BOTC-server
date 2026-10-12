// Une sauvegarde par mode de jeu : la partie locale et la partie multijoueur sont indépendantes
const STORAGE_KEYS = {
  local: 'botc-grimoire-v1',
  multi: 'botc-grimoire-multi-v1',
};

export const loadGame = (mode = 'local') => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[mode]);
    const data = raw ? JSON.parse(raw) : null;
    return data && Array.isArray(data.players) ? data : null;
  } catch {
    return null;
  }
};

export const saveGame = (state, mode = 'local') => {
  try {
    localStorage.setItem(STORAGE_KEYS[mode], JSON.stringify(state));
  } catch {
    // Stockage indisponible (navigation privée, quota) : la partie reste en mémoire
  }
};
