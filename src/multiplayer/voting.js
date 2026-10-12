// Règles du vote de la journée (Blood on the Clocktower) :
// - chaque joueur vivant peut nominer une fois par jour, chaque joueur ne peut être nominé qu'une fois ;
// - tous les vivants votent ; un mort ne dispose que d'un seul vote pour le reste de la partie ;
// - il faut au moins la moitié des vivants pour être condamné, et le plus de voix l'emporte ;
// - en cas d'égalité en tête, personne n'est exécuté.

export const voteThreshold = (players) => Math.ceil(players.filter((p) => p.alive).length / 2);

export const canVote = (player) => !!player && (player.alive || !player.ghostUsed);

// Le Majordome ne peut voter pour l'exécution que si son Maître l'a fait avant lui
export const butlerMaster = (player, players) => (player?.role === 'butler' && player.alive
  ? players.find((p) => p.master && p.id !== player.id) ?? null
  : null);

export const canVoteYes = (player, players, nomination) => {
  const master = butlerMaster(player, players);
  return !master || nomination.votes[master.id] === true;
};

export const openNomination = (day) => day?.nominations.find((n) => n.open) ?? null;

export const yesVoters = (nomination) => Object.entries(nomination.votes)
  .filter(([, value]) => value)
  .map(([id]) => Number(id));

export const canNominate = (player, day) => !!player && player.alive && day?.phase === 'nominations'
  && !openNomination(day) && !day.nominations.some((n) => n.nominatorId === player.id);

// Un mort peut être nominé, comme dans le jeu
export const canBeNominated = (player, day) => !!player
  && !day.nominations.some((n) => n.nomineeId === player.id);

// Résultat des votes clos et joueur actuellement condamné (null si aucun ou égalité)
export const voteSummary = (day, players) => {
  const threshold = voteThreshold(players);
  const results = (day?.nominations ?? []).filter((n) => !n.open).map((n) => ({
    id: n.id,
    nominatorId: n.nominatorId,
    nomineeId: n.nomineeId,
    yes: yesVoters(n),
    threshold: n.threshold,
  }));
  const qualified = results.filter((r) => r.yes.length >= r.threshold);
  const best = Math.max(0, ...qualified.map((r) => r.yes.length));
  const leaders = qualified.filter((r) => r.yes.length === best);
  return { threshold, results, onBlockId: leaders.length === 1 ? leaders[0].nomineeId : null };
};

export const formatCountdown = (ms) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
