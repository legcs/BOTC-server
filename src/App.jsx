import React, { useState, useRef, useEffect } from 'react';

// Imports des données
import { nightOrder } from './data/nightOrder';

// Imports des utils
import { getActionType, getRoleCategory, getRoleName, holdsRole } from './utils/roleUtils';
import { getTargetError, knowsWithoutTargets } from './utils/targetRules';
import { roles } from './data/roles';
import { assignRoles, canUseAbility, getVictory, pickRandom, resolveDemonDeath, shuffleArray, virginTriggers } from './utils/gameLogic';
import { calculateCirclePositions } from './utils/positionUtils';
import { loadGame, saveGame } from './utils/storage';

// Imports du mode multijoueur
import { useRelay } from './multiplayer/useRelay';
import { buildRelayState, EVIL_INFO_MIN_PLAYERS, INFO_ROLES, isMinion, pickDemonBluffs } from './multiplayer/views';
import { canBeNominated, canNominate, canVote, canVoteYes, openNomination, voteSummary, voteThreshold, yesVoters } from './multiplayer/voting';

// Imports des composants
import VictoryModal from './components/VictoryModal';
import HelpModal from './components/HelpModal';
import ChoiceModal from './components/ChoiceModal';
import Header from './components/Header';
import GrimoireSection from './components/GrimoireSection';
import Sidebar from './components/Sidebar';
import ActionControlPanel from './components/ActionControlPanel';

// import des roles
import { roleHandlers } from './components/roles';

// Import des styles
import { globalStyles } from './styles/globalStyles';

const defaultPlayerState = {
  role: 'unknown',
  alive: true,
  executed: false,
  poisoned: false,
  protected: false,
  decoy: false,
  ivre: false,
  master: false,
  used: false,
  // Un mort ne vote qu'une seule fois dans le reste de la partie
  ghostUsed: false,
  // Ermite ou Espion : rôle sous lequel le Conteur le fait passer auprès des autres capacités
  seenAs: null,
  notes: '',
  shownRole: null,
};

// Information des maléfiques, apprise la première nuit à partir de 7 joueurs
const evilInfoOf = (players) => (players.length >= EVIL_INFO_MIN_PLAYERS ? {
  demonId: players.find(p => p.role === 'imp')?.id ?? null,
  minionIds: players.filter(isMinion).map(p => p.id),
} : null);

// `session` est fourni en mode multijoueur : le grimoire est alors publié aux joueurs connectés
export default function BotCStoryteller({ session = null, onSession, onQuit }) {
  const mode = session ? 'multi' : 'local';

  // ===== ÉTAT =====
  // Partie sauvegardée dans le navigateur (survit à un rechargement de la page)
  const [saved] = useState(() => loadGame(mode));
  const [players, setPlayersState] = useState(saved?.players ?? []);
  const playersRef = useRef(players);
  const [currentTime, setCurrentTime] = useState(saved?.currentTime ?? 'NUIT');
  const [currentNight, setCurrentNight] = useState(saved?.currentNight ?? 1);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [nightLog, setNightLog] = useState(saved?.nightLog ?? [{ night: 1, events: [] }]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [containerSize, setContainerSize] = useState({ width: 600, height: 600 });
  const [lastExecutedPlayerId, setLastExecutedPlayerId] = useState(saved?.lastExecutedPlayerId ?? null);
  const [killedTonightId, setKilledTonightId] = useState(saved?.killedTonightId ?? null);
  const [executionToday, setExecutionToday] = useState(saved?.executionToday ?? false);
  const [completedActions, setCompletedActions] = useState(saved?.completedActions ?? []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Fin de partie déclarée par une règle ponctuelle (Saint, Maire)
  const [forcedEnd, setForcedEnd] = useState(null);
  // État des joueurs pour lequel le Conteur a refermé l'annonce de victoire
  const [dismissedFor, setDismissedFor] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [draggingPlayerId, setDraggingPlayerId] = useState(null);
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 });
  const [roleAssigned, setRoleAssigned] = useState(saved?.roleAssigned ?? false);
  const [isStarted, setIsStarted] = useState(saved?.isStarted ?? false);
  // Joueurs déjà morts au début de la nuit : les morts de la nuit restent secrètes jusqu'au jour
  const [deadAtNightStart, setDeadAtNightStart] = useState(saved?.deadAtNightStart ?? []);
  // Rôles absents de la partie montrés au Démon pour bluffer
  const [demonBluffs, setDemonBluffs] = useState(saved?.demonBluffs ?? []);
  // Bluffs que le Démon a transmis à ses Sbires : { rôle: [id des Sbires] }
  const [bluffShares, setBluffShares] = useState(saved?.bluffShares ?? {});
  // Qui les maléfiques ont appris à connaître la première nuit (figé : une succession reste secrète)
  const [evilInfo, setEvilInfo] = useState(saved?.evilInfo ?? null);
  // Ce que l'Espion a vu du grimoire lors de sa dernière consultation
  const [spyGrimoire, setSpyGrimoire] = useState(saved?.spyGrimoire ?? null);
  // Décision demandée au Conteur en cours de résolution (ex. Maire attaqué de nuit)
  const [pendingChoice, setPendingChoice] = useState(null);
  // Multijoueur : discussion, joueurs connectés au salon
  const [chat, setChat] = useState([]);
  const [roster, setRoster] = useState([]);
  const [hostedTick, setHostedTick] = useState(0);
  // Multijoueur : durée du débat (réglée avant le début) et déroulement de la journée en cours
  const [debateMinutes, setDebateMinutes] = useState(saved?.debateMinutes ?? 5);
  const [day, setDayState] = useState(saved?.day ?? null);
  const dayRef = useRef(day);
  const [now, setNow] = useState(() => Date.now());

  const containerRef = useRef(null);

  // ===== EFFETS =====
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const dayBackground = document.querySelector('.day-background');
    const nightBackground = document.querySelector('.night-background');

    if (dayBackground && nightBackground) {
      dayBackground.classList.remove('active', 'inactive');
      nightBackground.classList.remove('active', 'inactive');

      if (currentTime === 'JOUR') {
        dayBackground.classList.add('active');
        nightBackground.classList.add('inactive');
      } else {
        dayBackground.classList.add('inactive');
        nightBackground.classList.add('active');
      }
    }
  }, [currentTime]);

  // Suivre la taille du grimoire
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Les tokens sont placés en cercle. Un token déplacé à la main garde sa place tant que
  // le grimoire ne change pas de taille et que la liste des joueurs ne change pas.
  const layoutKey = `${players.map(p => p.id).join(',')}|${containerSize.width}x${containerSize.height}`;
  const [movedTokens, setMovedTokens] = useState({ layoutKey, positions: {} });
  const circlePositions = calculateCirclePositions(players, containerSize);
  const playerPositions = movedTokens.layoutKey === layoutKey
    ? { ...circlePositions, ...movedTokens.positions }
    : circlePositions;
  const setPlayerPositions = (update) => setMovedTokens(prev => {
    const current = prev.layoutKey === layoutKey ? { ...circlePositions, ...prev.positions } : circlePositions;
    return { layoutKey, positions: typeof update === 'function' ? update(current) : update };
  });

  // Conditions de victoire permanentes, recalculées à chaque changement des joueurs
  const victory = roleAssigned && players.length > 0 ? getVictory(players) : null;
  const gameEnd = forcedEnd ?? victory;

  useEffect(() => {
    saveGame({
      players,
      currentTime,
      currentNight,
      nightLog,
      completedActions,
      roleAssigned,
      isStarted,
      executionToday,
      lastExecutedPlayerId,
      killedTonightId,
      deadAtNightStart,
      demonBluffs,
      bluffShares,
      evilInfo,
      spyGrimoire,
      debateMinutes,
      day,
    }, mode);
  }, [mode, players, currentTime, currentNight, nightLog, completedActions, roleAssigned, isStarted, executionToday, lastExecutedPlayerId, killedTonightId, deadAtNightStart, demonBluffs, bluffShares, evilInfo, spyGrimoire, debateMinutes, day]);


  // ===== HANDLERS =====
  // Toute modification des joueurs passe par ici : si le Démon vient de mourir
  // et que la Confidente peut lui succéder, elle devient aussitôt le nouveau Démon.
  const setPlayers = (update) => {
    const hasPoisoner = (list) => list.some(p => p.role === 'poisoner' && p.alive);
    let next = typeof update === 'function' ? update(playersRef.current) : update;
    const succession = roleAssigned && !gameEnd ? resolveDemonDeath(next) : null;
    next = succession?.players ?? next;
    // L'Empoisonneur qui meurt ou change de rôle perd sa capacité : son poison cesse aussitôt
    if (hasPoisoner(playersRef.current) && !hasPoisoner(next)) {
      next = next.map(p => (p.poisoned ? { ...p, poisoned: false } : p));
    }
    playersRef.current = next;
    setPlayersState(playersRef.current);
    if (succession) addNightEvent(succession.event);
  };

  const updatePlayer = (playerId, updates) => {
    const changes = { ...updates };
    if ('role' in updates) {
      // Le Soûlard reçoit un rôle de Villageois absent de la partie, qu'il croit avoir
      const taken = new Set(playersRef.current.flatMap(p => [p.role, p.shownRole]));
      changes.shownRole = updates.role === 'drunk'
        ? pickRandom(roles.townsfolk.filter(r => r.id !== 'unknown' && !taken.has(r.id)))?.id ?? null
        : null;
      changes.seenAs = null;
    }
    // Un joueur que le Conteur fait mourir pendant la nuit est une mort de la nuit (réveil du Gardien)
    if (updates.alive === false && currentTime === 'NUIT') setKilledTonightId(playerId);
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...changes } : p));
  };

  const endGame = (gameWinner, reason) => {
    setForcedEnd({ winner: gameWinner, reason });
    setDismissedFor(null);
  };

  // ----- Journée multijoueur : débat, nominations, votes -----
  const setDay = (update) => {
    dayRef.current = typeof update === 'function' ? update(dayRef.current) : update;
    setDayState(dayRef.current);
  };

  const openNominations = () => {
    if (dayRef.current?.phase !== 'debate') return;
    setDay(d => ({ ...d, phase: 'nominations' }));
    addNightEvent('🗳️ Fin du débat : les nominations sont ouvertes');
  };

  const nominate = (nominator, nomineeId) => {
    const nominee = playersRef.current.find(p => p.id === nomineeId);
    if (!canNominate(nominator, dayRef.current) || !canBeNominated(nominee, dayRef.current)) return;

    // Première nomination de la Vierge : sa capacité est dépensée, et un nominateur Villageois est exécuté
    if (holdsRole(nominee, 'virgin') && nominee.alive && !nominee.used) {
      const triggers = virginTriggers(nominee, nominator);
      setPlayers(prev => prev.map(p => (p.id === nominee.id ? { ...p, used: true } : p)));
      if (triggers) {
        addNightEvent(`🕊️ ${nominator.name} nomine ${nominee.name} (Vierge) : Villageois, il est exécuté sur-le-champ`);
        executePlayer(nominator.id);
        return;
      }
    }
    setDay(d => ({
      ...d,
      nominations: [...d.nominations, {
        id: d.nominations.length + 1,
        nominatorId: nominator.id,
        nomineeId,
        votes: {},
        open: true,
        threshold: voteThreshold(playersRef.current),
      }],
    }));
    addNightEvent(`🗳️ ${nominator.name} nomine ${nominee.name}`);
  };

  const closeVote = () => {
    const open = openNomination(dayRef.current);
    if (!open) return;
    const yes = yesVoters(open);
    const nameOf = (id) => playersRef.current.find(p => p.id === id)?.name;
    setDay(d => ({ ...d, nominations: d.nominations.map(n => (n.id === open.id ? { ...n, open: false } : n)) }));
    // Un mort qui vote pour l'exécution dépense son unique vote
    const ghosts = playersRef.current.filter(p => !p.alive && yes.includes(p.id)).map(p => p.id);
    if (ghosts.length > 0) {
      setPlayers(prev => prev.map(p => (ghosts.includes(p.id) ? { ...p, ghostUsed: true } : p)));
    }
    addNightEvent(`🗳️ Vote contre ${nameOf(open.nomineeId)} : ${yes.length} voix sur ${open.threshold} nécessaires${yes.length > 0 ? ` (${yes.map(nameOf).join(', ')})` : ''}`);
  };

  const castVote = (voter, value) => {
    const open = openNomination(dayRef.current);
    if (!open || !canVote(voter) || voter.id in open.votes) return;
    if (value && !canVoteYes(voter, playersRef.current, open)) return;
    setDay(d => ({
      ...d,
      nominations: d.nominations.map(n => (n.id === open.id ? { ...n, votes: { ...n.votes, [voter.id]: value } } : n)),
    }));
    // Le vote se clôt de lui-même quand tous les joueurs connectés se sont prononcés
    const votes = openNomination(dayRef.current).votes;
    if (playersRef.current.filter(p => p.key && canVote(p)).every(p => p.id in votes)) closeVote();
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newId = Math.max(0, ...players.map(p => p.id)) + 1;
    setPlayers([...players, {
      ...defaultPlayerState,
      id: newId,
      name: newPlayerName.trim(),
    }]);
    setNewPlayerName('');
    setShowAddPlayer(false);
    setRoleAssigned(false);
  };

  const removePlayer = (playerId) => {
    const removed = players.find(p => p.id === playerId);
    if (removed?.key) relay.send({ t: 'kick', key: removed.key });
    setPlayers(players.filter(p => p.id !== playerId));
    setSelectedPlayerId(null);
  };

  const executePlayer = (playerId) => {
    // État le plus récent : une capacité (Vierge) peut l'avoir modifié juste avant
    const current = playersRef.current;
    const player = current.find(p => p.id === playerId);
    if (!player) return;

    setExecutionToday(true);
    setLastExecutedPlayerId(playerId);
    const afterExecution = current.map(p => p.id === playerId
      ? { ...p, alive: false, executed: true, poisoned: false, protected: false, master: false }
      : p);

    // Le Saint empoisonné/ivre perd sa capacité : son exécution est alors normale
    if (player.role === 'saint' && player.alive && canUseAbility(player)) {
      addNightEvent(`🪽 ${player.name} (Saint) est exécuté - LE MAL GAGNE !`);
      setPlayers(afterExecution);
      endGame('evil', 'Le Saint a été exécuté.');
      return;
    }

    addNightEvent(player.role === 'imp'
      ? `👺 ${player.name} (Démon) est exécuté`
      : `💀 ${player.name} (${getRoleName(player.role)}) est exécuté`);

    // Si l'exécution termine la partie, on reste sur le jour pour annoncer la victoire
    const settled = resolveDemonDeath(afterExecution)?.players ?? afterExecution;
    if (getVictory(settled)) {
      setPlayers(afterExecution);
      return;
    }

    startNewNight(afterExecution);
  };

  const skipExecution = () => {
    addNightEvent('⏭️ Pas d\'exécution aujourd\'hui');
    setLastExecutedPlayerId(null);

    // Maire : 3 joueurs vivants et aucune exécution à la fin du jour
    const alivePlayers = players.filter(p => p.alive);
    const mayor = alivePlayers.find(p => p.role === 'mayor');
    if (alivePlayers.length === 3 && !executionToday && canUseAbility(mayor)) {
      endGame('village', "Il reste 3 joueurs et aucune exécution aujourd'hui. Le Maire fait gagner le Village !");
      return;
    }

    startNewNight();
  };

  // `to` : joueur à qui l'information est destinée (visible sur son écran en multijoueur)
  const addNightEvent = (text, actionKey = null, night = currentNight, to = null) => {
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const event = {
      time,
      text: text.replace('[FAUX]', ''), // Retirer le marqueur du texte
      isFalse: text.includes('[FAUX]'),
      ...(to !== null ? { to } : {}),
    };

    setNightLog(log => (log.some(n => n.night === night)
      ? log.map(n => (n.night === night ? { ...n, events: [event, ...n.events] } : n))
      : [...log, { night, events: [event] }]));

    if (actionKey !== null) {
      setCompletedActions(prev => [...prev, actionKey]);
    }
  };

  const startNewNight = (basePlayers = players) => {
    const nextNight = currentNight + 1;
    setIsStarted(true);
    setCurrentTime('NUIT');
    setCurrentNight(nextNight);
    setNightLog(log => (log.some(n => n.night === nextNight) ? log : [...log, { night: nextNight, events: [] }]));

    // Réinitialiser les statuts temporaires
    setPlayers(basePlayers.map(p => ({
      ...p,
      protected: false,
      poisoned: false // ← Le poison dure la nuit et le jour suivant : il cesse au crépuscule
    })));

    setCompletedActions([]);
    setKilledTonightId(null);
    setDeadAtNightStart(basePlayers.filter(p => !p.alive).map(p => p.id));
    setDay(null);
  };

  const startNewDay = () => {
    setExecutionToday(false);
    setLastExecutedPlayerId(null);
    setIsStarted(true);
    addNightEvent('☀️ Lever du soleil - Début du jour');
    // La protection du Moine ne vaut que pour la nuit
    setPlayers(prev => prev.map(p => (p.protected ? { ...p, protected: false } : p)));
    setCurrentTime('JOUR');
    setCompletedActions([]);
    if (session) {
      // Multijoueur : le débat est chronométré, puis les joueurs nominent et votent sur leur écran
      const start = Date.now();
      setNow(start);
      setDay(debateMinutes > 0
        ? { phase: 'debate', endsAt: start + debateMinutes * 60000, nominations: [] }
        : { phase: 'nominations', endsAt: null, nominations: [] });
    }
  };

  const resetProgress = () => {
    cancelAction();
    setCurrentTime('NUIT');
    setCurrentNight(1);
    setNightLog([{ night: 1, events: [] }]);
    setCompletedActions([]);
    setExecutionToday(false);
    setLastExecutedPlayerId(null);
    setKilledTonightId(null);
    setDeadAtNightStart([]);
    setDay(null);
  };

  const assignRolesToPlayers = () => {
    if (players.length < 5 || players.length > 15) return;

    resetProgress();
    const assigned = assignRoles(players);
    setPlayers(assigned);
    setRoleAssigned(true);
    const bluffs = pickDemonBluffs(assigned, shuffleArray);
    setDemonBluffs(bluffs);
    setBluffShares({});
    setEvilInfo(evilInfoOf(assigned));
    setSpyGrimoire(null);

    const count = (category) => assigned.filter(p => getRoleCategory(p.role) === category).length;
    addNightEvent(
      `🎲 Rôles distribués : ${count('townsfolk')} Villageois, ${count('outsider')} Étrangers, ${count('minion')} Sbires, ${count('demon')} Démon`,
      null,
      1
    );
    if (bluffs.length > 0) {
      addNightEvent(`👺 Bluffs du Démon (rôles absents de la partie) : ${bluffs.map(getRoleName).join(', ')}`, null, 1);
    }
  };

  const restartGame = () => {
    resetProgress();
    setIsStarted(false);
    setPlayers(players.map(p => ({ ...p, ...defaultPlayerState })));
    setRoleAssigned(false);
    setDemonBluffs([]);
    setBluffShares({});
    setEvilInfo(null);
    setSpyGrimoire(null);
    setPendingChoice(null);
    setForcedEnd(null);
    setDismissedFor(null);
    setSelectedPlayerId(null);
  };

  const startAction = (role, action, actionKey) => {
    if (completedActions.includes(actionKey)) return;

    // Rien à désigner : le résultat est connu d'avance (Libraire sans Étranger en jeu)
    if (knowsWithoutTargets(role, players, findActor(role))) {
      runRoleAction(role, action, actionKey, []);
      return;
    }

    setActiveAction({
      role,
      action,
      actionKey,
      type: getActionType(role),
    });
    setSelectedTargets([]);
  };

  // Le joueur qui utilise la capacité. Le Gardien agit après sa mort, la nuit où il est tué.
  // Un Soûlard agit à la place du Villageois qu'il croit être.
  const findActor = (role) => (role === 'ravenkeeper'
    ? players.find(p => holdsRole(p, role) && p.id === killedTonightId)
    : players.find(p => holdsRole(p, role) && p.alive));

  const handleTokenClickDuringAction = (playerId) => {
    if (!activeAction) return;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const { role, type } = activeAction;

    // Vérifications selon le type d'action
    if ((type === 'select_one_not_self' || type === 'select_one_master') && playerId === findActor(role)?.id) {
      // Ne peut pas se sélectionner soi-même
      return;
    }

    // Gestion de la sélection
    if (type === 'select_one' || type === 'select_one_not_self' || type === 'select_one_kill' || type === 'select_one_master' || type === 'select_one_info') {
      setSelectedTargets([playerId]);
    } else if (type === 'select_two' || type === 'select_two_info') {
      if (selectedTargets.includes(playerId)) {
        // Désélectionner
        setSelectedTargets(selectedTargets.filter(id => id !== playerId));
      } else if (selectedTargets.length < 2) {
        // Ajouter à la sélection
        setSelectedTargets([...selectedTargets, playerId]);
      } else {
        // Remplacer le premier par le nouveau
        setSelectedTargets([selectedTargets[1], playerId]);
      }
    }
  };

  const runRoleAction = (role, action, actionKey, targets = []) => {
    const handler = roleHandlers[role];
    if (!handler) {
      addNightEvent(`${action}`, actionKey);
      return;
    }

    const actor = findActor(role);
    handler({
      targets,
      players,
      actor,
      lastExecutedPlayerId,
      // Le résultat d'un rôle à information est destiné au joueur qui l'a
      addNightEvent: (text, key) => addNightEvent(text, key, currentNight, INFO_ROLES.includes(role) ? actor?.id ?? null : null),
      actionKey,
      setPlayers,
      onNightDeath: setKilledTonightId,
      executePlayer,
      ask: setPendingChoice,
    });

    // L'Espion voit le grimoire tel qu'il est au moment où il le consulte
    if (role === 'spy' && actor?.role === 'spy' && canUseAbility(actor)) {
      setSpyGrimoire({
        night: currentNight,
        players: Object.fromEntries(playersRef.current.map(p => [p.id, {
          role: p.role === 'dead' ? 'imp' : p.role,
          poisoned: p.poisoned, ivre: p.ivre || p.role === 'drunk', protected: p.protected, decoy: p.decoy, master: p.master,
        }])),
      });
    }
  };

  const confirmAction = () => {
    if (!activeAction) return;

    const { role, action, actionKey } = activeAction;
    const targets = selectedTargets.map(id => players.find(p => p.id === id)).filter(Boolean);
    if (getTargetError(role, targets, findActor(role))) return;
    runRoleAction(role, action, actionKey, targets);
    cancelAction();
  };

  const cancelAction = () => {
    setActiveAction(null);
    setSelectedTargets([]);
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error(`Erreur lors du passage en plein écran: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const playerId = parseInt(e.dataTransfer.getData('playerId'));
    if (!playerId) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPlayerPositions(prev => ({
      ...prev,
      [playerId]: { x, y }
    }));
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // ===== MULTIJOUEUR =====
  // Le salon se ferme dès que les rôles sont distribués : plus personne ne peut rejoindre
  // (un joueur déjà installé peut toujours revenir après une coupure)
  const joinOpen = !roleAssigned && !isStarted && currentTime === 'NUIT' && currentNight === 1 && players.length < 15;
  const activeActor = activeAction ? findActor(activeAction.role) : null;

  const handleRelayMessage = (msg) => {
    if (msg.t === 'hosted') {
      onSession?.({ room: msg.room, token: msg.token });
      setHostedTick(tick => tick + 1);
    } else if (msg.t === 'history') {
      setChat(msg.messages);
    } else if (msg.t === 'chat') {
      setChat(prev => [...prev, msg.message]);
    } else if (msg.t === 'roster') {
      setRoster(msg.players);
      // Chaque nouveau connecté prend place dans le cercle
      const seated = new Set(playersRef.current.map(p => p.key).filter(Boolean));
      const newcomers = msg.players.filter(p => !seated.has(p.key));
      if (newcomers.length === 0) return;
      if (!joinOpen) {
        newcomers.forEach(p => relay.send({ t: 'kick', key: p.key }));
        return;
      }
      setPlayers(prev => {
        let nextId = Math.max(0, ...prev.map(p => p.id));
        return [...prev, ...newcomers.map(p => ({ ...defaultPlayerState, id: ++nextId, name: p.name, key: p.key }))];
      });
      setRoleAssigned(false);
    } else if (msg.t === 'act') {
      // Nomination ou vote d'un joueur depuis son écran
      const actor = playersRef.current.find(p => p.key === msg.key);
      if (!actor || gameEnd) return;
      if (msg.kind === 'bluff') {
        // Le Démon transmet (ou retire) un de ses bluffs à un Sbire
        const minion = playersRef.current.find(p => p.id === msg.id);
        if (actor.role !== 'imp' || !actor.alive || !demonBluffs.includes(msg.role) || !minion || !isMinion(minion)) return;
        setBluffShares(prev => {
          const others = (prev[msg.role] ?? []).filter(id => id !== minion.id);
          return { ...prev, [msg.role]: msg.value ? [...others, minion.id] : others };
        });
        return;
      }
      if (currentTime !== 'JOUR') return;
      if (msg.kind === 'nominate') nominate(actor, msg.id);
      else castVote(actor, msg.value);
    } else if (msg.t === 'targets') {
      // Un joueur a désigné les cibles de sa capacité : le Conteur n'a plus qu'à confirmer
      if (!activeAction || !activeActor || activeActor.key !== msg.key) return;
      // Lavandière, Libraire, Enquêteur : c'est le Conteur qui désigne les deux joueurs
      if (activeAction.type === 'select_two_info') return;
      const count = activeAction.type.includes('two') ? 2 : 1;
      const ids = [...new Set(msg.ids)]
        .filter(id => players.some(p => p.id === id))
        .filter(id => !(['select_one_not_self', 'select_one_master'].includes(activeAction.type) && id === activeActor.id))
        .slice(0, count);
      setSelectedTargets(ids);
    }
  };

  const relay = useRelay({
    enabled: !!session,
    hello: () => ({ t: 'host', room: session?.room, token: session?.token }),
    onMessage: handleRelayMessage,
  });
  const sendRelay = relay.send;

  // Publie la partie : l'état public et ce que chaque joueur a le droit de voir
  const relayPayload = session ? JSON.stringify({
    t: 'state',
    ...buildRelayState({
      players, currentTime, currentNight, roleAssigned, joinOpen, gameEnd, deadAtNightStart, demonBluffs, bluffShares, evilInfo, spyGrimoire,
      nightLog, activeAction, actorId: activeActor?.id ?? null, selectedTargets, day,
    }),
  }) : null;
  useEffect(() => {
    // L'heure du Conteur accompagne chaque envoi : les joueurs calent leur compte à rebours dessus
    if (relayPayload) sendRelay(`${relayPayload.slice(0, -1)},"hostNow":${Date.now()}}`);
  }, [relayPayload, sendRelay, hostedTick]);

  // Compte à rebours du débat ; à son terme, les nominations s'ouvrent d'elles-mêmes
  const debating = !!session && currentTime === 'JOUR' && day?.phase === 'debate';
  useEffect(() => {
    if (!debating) return undefined;
    const timer = setInterval(() => {
      const current = dayRef.current;
      setNow(Date.now());
      if (current?.phase === 'debate' && Date.now() >= current.endsAt) {
        dayRef.current = { ...current, phase: 'nominations' };
        setDayState(dayRef.current);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [debating]);

  const dayVote = session && day && currentTime === 'JOUR' ? {
    day,
    remaining: day.endsAt ? day.endsAt - now : 0,
    summary: voteSummary(day, players),
    open: openNomination(day),
    voters: players.filter(canVote).length,
    onOpenNominations: openNominations,
    onCloseVote: closeVote,
  } : null;

  const multiplayer = session ? {
    room: session.room,
    status: relay.status,
    roster,
    chat,
    recipients: players.filter(p => p.key).map(p => ({ id: p.key, label: p.name })),
    onSendChat: (to, text) => relay.send({ t: 'chat', to, text }),
    dayVote,
    // La durée du débat se règle avant le début de la partie
    debate: !isStarted ? { minutes: debateMinutes, onChange: setDebateMinutes } : null,
  } : null;

  // ===== RENDER =====
  return (
    <div style={{
      maxHeight: '100%',
      width: '100%',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: '"Crimson Text", Georgia, serif',
      color: '#e8e0d5',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{globalStyles}</style>

      {/* Backgrounds */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `
          radial-gradient(ellipse at 20% 20%, rgba(139, 69, 69, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(75, 0, 130, 0.08) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />

      <Header
        currentTime={currentTime}
        currentNight={currentNight}
        onAssignRoles={assignRolesToPlayers}
        onToggleHelp={() => setShowHelpModal(true)}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        roleAssigned={roleAssigned}
        restartGame={restartGame}
        isStarted={isStarted}
        multiplayer={multiplayer}
        onQuit={onQuit}
      />

      <main className="main-layout" style={{
        display: 'flex',
        width: '100%',
        height: 'calc(100vh - 60px)',
        position: 'relative',
      }}>
        <GrimoireSection
          containerRef={containerRef}
          players={players}
          playerPositions={playerPositions}
          containerSize={containerSize}
          selectedPlayerId={selectedPlayerId}
          activeAction={activeAction}
          selectedTargets={selectedTargets}
          currentTime={currentTime}
          currentNight={currentNight}
          showAddPlayer={showAddPlayer}
          newPlayerName={newPlayerName}
          draggingPlayerId={draggingPlayerId}
          touchOffset={touchOffset}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onSelectPlayer={setSelectedPlayerId}
          onUpdatePlayer={updatePlayer}
          onRemovePlayer={removePlayer}
          onShowAddPlayer={setShowAddPlayer}
          onSetNewPlayerName={setNewPlayerName}
          setDraggingPlayerId={setDraggingPlayerId}
          setTouchOffset={setTouchOffset}
          setPlayerPositions={setPlayerPositions}
          addPlayer={addPlayer}
          handleTokenClickDuringAction={handleTokenClickDuringAction}
          setSelectedPlayerId={setSelectedPlayerId}
          roleAssigned={roleAssigned}
          roleLocked={isStarted}
          multiplayer={!!session}
          room={session?.room ?? null}
        />

        <Sidebar
          currentTime={currentTime}
          currentNight={currentNight}
          nightLog={nightLog}
          completedActions={completedActions}
          players={players}
          nightOrder={nightOrder}
          onStartAction={startAction}
          onExecutePlayer={executePlayer}
          onSkipExecution={skipExecution}
          onStartNewDay={startNewDay}
          addNightEvent={addNightEvent}
          onAutoAction={runRoleAction}
          killedTonightId={killedTonightId}
          roleAssigned={roleAssigned}
          onAssignRoles={assignRolesToPlayers}
          setIsStarted={setIsStarted}
          multiplayer={multiplayer}
        />
      </main>

      {activeAction && (
        <ActionControlPanel
          activeAction={activeAction}
          selectedTargets={selectedTargets}
          remoteActor={session && activeActor?.key && activeAction.type !== 'select_two_info' ? activeActor.name : null}
          error={getTargetError(activeAction.role, selectedTargets.map(id => players.find(p => p.id === id)).filter(Boolean), activeActor)}
          onConfirm={confirmAction}
          onCancel={cancelAction}
        />
      )}

      {pendingChoice && (
        <ChoiceModal
          choice={pendingChoice}
          onChoose={(option) => {
            setPendingChoice(null);
            option.run();
          }}
        />
      )}

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}

      {gameEnd && dismissedFor !== players && (
        <VictoryModal
          winner={gameEnd.winner}
          reason={gameEnd.reason}
          onRestart={restartGame}
          onClose={() => {
            setForcedEnd(null);
            setDismissedFor(players);
          }}
        />
      )}
    </div>
  );
}
