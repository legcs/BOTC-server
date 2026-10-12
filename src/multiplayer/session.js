// Mode de jeu choisi par le Conteur et identifiants de salon, conservés dans le navigateur
const SESSION_KEY = 'botc-session-v1';
const seatKey = (room) => `botc-seat-${room}`;

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible : la session ne survivra pas à un rechargement
  }
};

export const loadSession = () => {
  const session = read(SESSION_KEY);
  return session?.mode === 'local' || session?.mode === 'multi' ? session : null;
};
export const saveSession = (session) => write(SESSION_KEY, session);

// Place d'un joueur dans un salon : la clé lui permet de revenir après une coupure
export const loadSeat = (room) => read(seatKey(room));
export const saveSeat = (room, seat) => write(seatKey(room), seat);

export const roomFromUrl = () => {
  const code = new URLSearchParams(window.location.search).get('room');
  return code ? code.trim().toUpperCase() : null;
};

export const joinUrl = (room) => `${window.location.origin}${window.location.pathname}?room=${room}`;

// Salon du Conteur, conservé pour reprendre la même partie multijoueur plus tard
const HOST_KEY = 'botc-host-v1';
export const loadHost = () => read(HOST_KEY);
export const saveHost = (host) => write(HOST_KEY, host);
