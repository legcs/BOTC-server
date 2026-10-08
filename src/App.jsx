import React, { useState, useRef, useEffect } from 'react';

// Imports des données
import { nightOrder } from './data/nightOrder';

// Imports des utils
import { getActionType, getRoleCategory, getRoleName } from './utils/roleUtils';
import { assignRoles, canUseAbility, getVictory, resolveDemonDeath } from './utils/gameLogic';
import { calculateCirclePositions } from './utils/positionUtils';
import { loadGame, saveGame } from './utils/storage';

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
};

export default function BotCStoryteller() {
  // ===== ÉTAT =====
  // Partie sauvegardée dans le navigateur (survit à un rechargement de la page)
  const [saved] = useState(loadGame);
  const [players, setPlayers] = useState(saved?.players ?? []);
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
  const [playerPositions, setPlayerPositions] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [victoryReason, setVictoryReason] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [draggingPlayerId, setDraggingPlayerId] = useState(null);
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 });
  const [roleAssigned, setRoleAssigned] = useState(saved?.roleAssigned ?? false);
  const [isStarted, setIsStarted] = useState(saved?.isStarted ?? false);

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

  // Replacer les tokens en cercle quand le grimoire change de taille ou que la liste
  // des joueurs change (un token déplacé à la main garde sa place le reste du temps)
  const playerIds = players.map(p => p.id).join(',');
  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      setPlayerPositions(calculateCirclePositions(players, containerSize));
    }
  }, [playerIds, containerSize.width, containerSize.height]);

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
    });
  }, [players, currentTime, currentNight, nightLog, completedActions, roleAssigned, isStarted, executionToday, lastExecutedPlayerId, killedTonightId]);


  // ===== HANDLERS =====
  const updatePlayer = (playerId, updates) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...updates } : p));
  };

  const endGame = (gameWinner, reason) => {
    setGameOver(true);
    setWinner(gameWinner);
    setVictoryReason(reason);
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

    // Si l'exécution termine la partie, on reste sur le jour : l'effet annonce la victoire
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

  const addNightEvent = (text, actionKey = null, night = currentNight) => {
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const event = {
      time,
      text: text.replace('[FAUX]', ''), // Retirer le marqueur du texte
      isFalse: text.includes('[FAUX]'),
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
  };

  const assignRolesToPlayers = () => {
    if (players.length < 5 || players.length > 15) return;

    resetProgress();
    const assigned = assignRoles(players);
    setPlayers(assigned);
    setRoleAssigned(true);

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
    setGameOver(false);
    setWinner(null);
    setVictoryReason('');
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

    handler({
      targets,
      players,
      actor: findActor(role),
      lastExecutedPlayerId,
      addNightEvent,
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

  // Succession du Démon et conditions de victoire après chaque changement
  useEffect(() => {
    if (!roleAssigned || gameOver || players.length === 0) return;

    const succession = resolveDemonDeath(players);
    if (succession) {
      setPlayers(succession.players);
      addNightEvent(succession.event);
      return;
    }

    const victory = getVictory(players);
    if (victory) {
      endGame(victory.winner, victory.reason);
    }
  }, [players]);

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
        completedActions={completedActions}
        isStarted={isStarted}
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
          onSelectTarget={handleTokenClickDuringAction}
          onUpdatePlayer={updatePlayer}
          onRemovePlayer={removePlayer}
          onAddPlayer={addPlayer}
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
        />
      </main>

      {activeAction && (
        <ActionControlPanel
          activeAction={activeAction}
          selectedTargets={selectedTargets}
          onConfirm={confirmAction}
          onCancel={cancelAction}
        />
      )}

      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}

      {gameOver && (
        <VictoryModal
          winner={winner}
          reason={victoryReason}
          onRestart={restartGame}
          onClose={() => setGameOver(false)}
        />
      )}
    </div>
  );
}
