# Guide d'extraction des composants

## Comment extraire les composants du fichier original

### 1. HelpModal.jsx

**Localisation dans le fichier original :** Fonction `HelpModal` (environ lignes 570-900)

**À extraire :**
- La fonction complète `HelpModal` avec tous ses états et sections
- Les données `sections` avec tout le contenu d'aide

**Structure du composant :**
```javascript
import React, { useState } from 'react';

function HelpModal({ onClose }) {
  const [expandedSection, setExpandedSection] = useState(null);
  
  const toggleSection = (section) => { ... };
  
  const sections = [ ... ]; // Tout le contenu d'aide
  
  return ( ... );
}

export default HelpModal;
```

---

### 2. ActionControlPanel.jsx

**Localisation :** Dans le JSX de BotCStoryteller, après les PlayerTokens

**À extraire :**
```javascript
{activeAction && (
  <div style={{ ... }}>
    // Panneau de contrôle d'action
  </div>
)}
```

**Props nécessaires :**
- activeAction
- selectedTargets
- allRoles (from data)
- onConfirm (confirmAction)
- onCancel (cancelAction)

---

### 3. Header.jsx

**Localisation :** Balise `<header>` dans le JSX principal

**Props nécessaires :**
- currentTime
- currentNight
- onAssignRoles
- onToggleHelp
- onToggleFullscreen
- isFullscreen

---

### 4. GrimoireSection.jsx

**Localisation :** `<section className="grimoire-section">`

**Contient :**
- Le conteneur avec drag & drop
- Les backgrounds (jour/nuit)
- Le cercle central avec le compteur
- La grille des PlayerToken
- Le bouton "Ajouter un joueur"
- La StatusCard

**Props principales :**
- players
- playerPositions
- containerSize
- selectedPlayerId
- activeAction
- selectedTargets
- onDrop, onDragOver
- onSelectPlayer
- onUpdatePlayer
- onRemovePlayer
- onAddPlayer

---

### 5. Sidebar.jsx

**Localisation :** `<aside className="sidebar-section">`

**Contient :**
- NightOrderPanel
- JournalPanel

**Props :**
- currentTime
- currentNight
- nightLog
- completedActions
- players
- onStartAction
- onExecutePlayer
- onSkipExecution
- onStartNewDay

---

### 6. NightOrderPanel.jsx

**Localisation :** Premier `<div className="sidebar-panel">` dans Sidebar

**Affiche :**
- L'ordre de nuit selon currentTime et currentNight
- Les actions disponibles (cliquables)
- Les actions pour le jour (exécution)

**Props :**
- currentTime
- currentNight
- nightOrder (from data)
- completedActions
- players
- onStartAction
- onExecutePlayer
- onSkipExecution
- onStartNewDay

---

### 7. JournalPanel.jsx

**Localisation :** Deuxième `<div className="sidebar-panel">` dans Sidebar

**Affiche :**
- L'historique des événements par nuit
- Les événements avec timestamp
- Distinction des fausses informations

**Props :**
- nightLog (array of { night, events })

---

### 8. App.jsx - Structure principale

**Ce qui doit être dans App.jsx :**

```javascript
import React, { useState, useRef, useEffect } from 'react';

// Imports des données
import { allRoles } from './data/roles';
import { nightOrder } from './data/nightOrder';

// Imports des utils
import { getRoleCategory, getCategoryColor, getActionType } from './utils/roleUtils';
import { assignRoles, checkVictoryConditions, canUseAbility } from './utils/gameLogic';
import { calculateCirclePositions, calculateNewPlayerPosition } from './utils/positionUtils';

// Imports des composants
import PlayerToken from './components/PlayerToken';
import StatusCard from './components/StatusCard';
import VictoryModal from './components/VictoryModal';
import HelpModal from './components/HelpModal';
import Header from './components/Header';
import GrimoireSection from './components/GrimoireSection';
import Sidebar from './components/Sidebar';
import ActionControlPanel from './components/ActionControlPanel';

// Import des styles
import { globalStyles } from './styles/globalStyles';

export default function BotCStoryteller() {
  // ===== ÉTAT =====
  const [players, setPlayers] = useState([]);
  const [currentTime, setCurrentTime] = useState('NUIT');
  const [currentNight, setCurrentNight] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [nightLog, setNightLog] = useState([{ night: 1, events: [] }]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [containerSize, setContainerSize] = useState({ width: 600, height: 600 });
  const [lastExecutedPlayerId, setLastExecutedPlayerId] = useState(null);
  const [completedActions, setCompletedActions] = useState([]);
  const [playerPositions, setPlayerPositions] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [victoryReason, setVictoryReason] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [actionStep, setActionStep] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [draggingPlayerId, setDraggingPlayerId] = useState(null);
  const [touchOffset, setTouchOffset] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef(null);

  // ===== EFFETS =====
  // Tous les useEffect du fichier original
  
  // ===== HANDLERS =====
  const updatePlayer = (playerId, updates) => { ... };
  const addPlayer = () => { ... };
  const removePlayer = (playerId) => { ... };
  const executePlayer = (playerId) => { ... };
  const skipExecution = () => { ... };
  const addNightEvent = (text, actionKey = null) => { ... };
  const startNewNight = () => { ... };
  const startNewDay = () => { ... };
  const clearLogs = () => { ... };
  const assignRolesToPlayers = () => { ... };
  const restartGame = () => { ... };
  const startAction = (role, action, actionKey) => { ... };
  const handleTokenClickDuringAction = (playerId) => { ... };
  const confirmAction = () => { ... };
  const cancelAction = () => { ... };
  const toggleFullscreen = () => { ... };
  const handleDrop = (e) => { ... };
  const handleDragOver = (e) => { ... };

  // ===== RENDER =====
  return (
    <div style={{ ... }}>
      <style>{globalStyles}</style>
      
      {/* Backgrounds */}
      <div style={{ ... }} />
      
      <Header
        currentTime={currentTime}
        currentNight={currentNight}
        onAssignRoles={assignRolesToPlayers}
        onToggleHelp={() => setShowHelpModal(true)}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      <main className="main-layout" style={{ ... }}>
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
```

---

## 🔍 Conseils d'extraction

1. **Commencez par les composants simples** (Header, VictoryModal)
2. **Identifiez les props nécessaires** en regardant les variables utilisées
3. **Extrayez progressivement** pour éviter les erreurs
4. **Testez après chaque extraction** pour vérifier que rien n'est cassé
5. **Utilisez les DevTools React** pour inspecter les props

## 📝 Checklist

- [ ] HelpModal.jsx
- [ ] Header.jsx
- [ ] ActionControlPanel.jsx
- [ ] GrimoireSection.jsx
- [ ] Sidebar.jsx
- [ ] NightOrderPanel.jsx
- [ ] JournalPanel.jsx
- [ ] App.jsx (avec toute la logique)
- [ ] actionHandlers.js (optionnel - handlers d'actions)

## 🎯 Résultat final

Une fois terminé, vous aurez :
- **8 fichiers de données/utils** (déjà créés)
- **10+ fichiers de composants** React modulaires
- **1 fichier App.jsx** qui orchestre tout
- **Code maintenable et testable**