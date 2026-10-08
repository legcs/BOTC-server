const STORAGE_KEY = 'botc-grimoire-v1';

export const loadGame = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && Array.isArray(data.players) ? data : null;
  } catch {
    return null;
  }
};

export const saveGame = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Stockage indisponible (navigation privée, quota) : la partie reste en mémoire
  }
};
