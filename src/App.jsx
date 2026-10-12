import React, { useState, useRef, useEffect } from 'react';

// Imports des données
import { nightOrder } from './data/nightOrder';

// Imports des utils
import { getActionType, getRoleCategory, getRoleName } from './utils/roleUtils';
import { assignRoles, canUseAbility, getVictory, resolveDemonDeath, shuffleArray } from './utils/gameLogic';
import { calculateCirclePositions } from './utils/positionUtils';
import { loadGame, saveGame } from './utils/storage';

// Imports du mode multijoueur
import { useRelay } from './multiplayer/useRelay';
import { buildRelayState, INFO_ROLES, pickDemonBluffs } from './multiplayer/views';

// Imports des composants
import VictoryModal from './components/VictoryModal';
import HelpModal from './components/HelpModal';
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
  notes: '',
  shownRole: null,
};

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
  // Multijoueur : discussion, joueurs connectés au salon
  const [chat, setChat] = useState([]);
  const [roster, setRoster] = useState([]);
  const [hostedTick, setHostedTick] = useState(0);

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
    }, mode);
  }, [mode, players, currentTime, currentNight, nightLog, completedActions, roleAssigned, isStarted, executionToday, lastExecutedPlayerId, killedTonightId, deadAtNightStart, demonBluffs]);


  // ===== HANDLERS =====
  // Toute modification des joueurs passe par ici : si le Démon vient de mourir
  // et que la Confidente peut lui succéder, elle devient aussitôt le nouveau Démon.
  const setPlayers = (update) => {
    const next = typeof update === 'function' ? update(playersRef.current) : update;
    const succession = roleAssigned && !gameEnd ? resolveDemonDeath(next) : null;
    playersRef.current = succession?.players ?? next;
    setPlayersState(playersRef.current);
    if (succession) addNightEvent(succession.event);
  };

  const updatePlayer = (playerId, updates) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...updates } : p));
  };

  const endGame = (gameWinner, reason) => {
    setForcedEnd({ winner: gameWinner, reason });
    setDismissedFor(null);
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
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setExecutionToday(true);
    setLastExecutedPlayerId(playerId);
    const afterExecution = players.map(p => p.id === playerId
      ? { ...p, alive: false, executed: true, poisoned: false, protected: false, master: false }
      : p);

    // Le Saint empoisonné/ivre perd sa capacité : son exécution est alors normale
    if (player.role === 'saint' && canUseAbility(player)) {
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
      poisoned: false // ← L'empoisonnement ne dure qu'une nuit
    })));

    setCompletedActions([]);
    setKilledTonightId(null);
    setDeadAtNightStart(basePlayers.filter(p => !p.alive).map(p => p.id));
  };

  const startNewDay = () => {
    setExecutionToday(false);
    setLastExecutedPlayerId(null);
    setIsStarted(true);
    addNightEvent('☀️ Lever du soleil - Début du jour');
    setCurrentTime('JOUR');
    setCompletedActions([]);
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
  };

  const assignRolesToPlayers = () => {
    if (players.length < 5 || players.length > 15) return;

    resetProgress();
    const assigned = assignRoles(players);
    setPlayers(assigned);
    setRoleAssigned(true);
    setDemonBluffs(pickDemonBluffs(assigned, shuffleArray));

    const count = (category) => assigned.filter(p => getRoleCategory(p.role) === category).length;
    addNightEvent(
      `🎲 Rôles distribués : ${count('townsfolk')} Villageois, ${count('outsider')} Étrangers, ${count('minion')} Sbires, ${count('demon')} Démon`,
      null,
      1
    );
  };

  const restartGame = () => {
    resetProgress();
    setIsStarted(false);
    setPlayers(players.map(p => ({ ...p, ...defaultPlayerState })));
    setRoleAssigned(false);
    setDemonBluffs([]);
    setForcedEnd(null);
    setDismissedFor(null);
    setSelectedPlayerId(null);
  };

  const startAction = (role, action, actionKey) => {
    if (completedActions.includes(actionKey)) return;

    setActiveAction({
      role,
      action,
      actionKey,
      type: getActionType(role),
    });
    setSelectedTargets([]);
  };

  // Le joueur qui utilise la capacité. Le Gardien agit après sa mort, la nuit où il est tué.
  const findActor = (role) => (role === 'ravenkeeper'
    ? players.find(p => p.role === role && p.id === killedTonightId)
    : players.find(p => p.role === role && p.alive));

  const handleTokenClickDuringAction = (playerId) => {
    if (!activeAction) return;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const { role, type } = activeAction;

    // Vérifications selon le type d'action
    if (type === 'select_one_not_self' && playerId === findActor(role)?.id) {
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
    });
  };

  const confirmAction = () => {
    if (!activeAction) return;

    const { role, action, actionKey } = activeAction;
    const targets = selectedTargets.map(id => players.find(p => p.id === id)).filter(Boolean);
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
  // Les joueurs rejoignent le salon tant que la partie n'a pas commencé
  const joinOpen = currentTime === 'NUIT' && currentNight === 1 && !isStarted && players.length < 15;
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
    } else if (msg.t === 'targets') {
      // Un joueur a désigné les cibles de sa capacité : le Conteur n'a plus qu'à confirmer
      if (!activeAction || !activeActor || activeActor.key !== msg.key) return;
      const count = activeAction.type.includes('two') ? 2 : 1;
      const ids = [...new Set(msg.ids)]
        .filter(id => players.some(p => p.id === id))
        .filter(id => !(activeAction.type === 'select_one_not_self' && id === activeActor.id))
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
      players, currentTime, currentNight, roleAssigned, joinOpen, gameEnd, deadAtNightStart, demonBluffs,
      nightLog, activeAction, actorId: activeActor?.id ?? null, selectedTargets,
    }),
  }) : null;
  useEffect(() => {
    if (relayPayload) sendRelay(relayPayload);
  }, [relayPayload, sendRelay, hostedTick]);

  const multiplayer = session ? {
    room: session.room,
    status: relay.status,
    roster,
    chat,
    recipients: players.filter(p => p.key).map(p => ({ id: p.key, label: p.name })),
    onSendChat: (to, text) => relay.send({ t: 'chat', to, text }),
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
          remoteActor={session && activeActor?.key ? activeActor.name : null}
          onConfirm={confirmAction}
          onCancel={cancelAction}
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
