# 📝 Templates de Composants

## Template Header.jsx

```javascript
import React from 'react';

function Header({ 
  currentTime, 
  currentNight, 
  onAssignRoles, 
  onToggleHelp, 
  onToggleFullscreen, 
  isFullscreen 
}) {
  return (
    <header style={{
      background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%)',
      borderBottom: '1px solid rgba(139, 69, 69, 0.3)',
      padding: '0.75rem 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        {/* Titre */}
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #c9a55c 0%, #f4e4ba 50%, #c9a55c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Blood on the Clocktower - Grimoire du Conteur
          </h1>
        </div>

        {/* Contrôles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Badge Nuit/Jour */}
          <div style={{
            background: 'rgba(139, 69, 69, 0.2)',
            border: '1px solid rgba(139, 69, 69, 0.4)',
            borderRadius: '8px',
            padding: '0.4rem 0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            <span>{currentTime === 'NUIT' ? '🌙' : '☀️'}</span>
            <span style={{ fontFamily: '"Cinzel", serif', color: '#c9a55c' }}>
              {currentTime} {currentNight}
            </span>
          </div>
          
          {/* Bouton Assigner */}
          <button
            onClick={onAssignRoles}
            style={{
              background: 'linear-gradient(135deg, #2d1f3d 0%, #1a1a2e 100%)',
              border: '1px solid rgba(157, 78, 221, 0.4)',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              color: '#b794f4',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
            }}
          >
            Assigner les rôles
          </button>

          {/* Bouton Aide */}
          <button onClick={onToggleHelp} /* ... */>?</button>

          {/* Bouton Fullscreen */}
          <button onClick={onToggleFullscreen} /* ... */>⛶</button>
        </div>
      </div>
    </header>
  );
}

export default Header;
```

---

## Template ActionControlPanel.jsx

```javascript
import React from 'react';
import { allRoles } from '../data/roles';

function ActionControlPanel({ activeAction, selectedTargets, onConfirm, onCancel }) {
  if (!activeAction) return null;

  const canConfirm = 
    (activeAction.type.includes('two') && selectedTargets.length === 2) ||
    (activeAction.type.includes('one') && selectedTargets.length === 1) ||
    activeAction.type === 'auto';

  return (
    <div style={{
      position: 'absolute',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(26, 26, 46, 0.98)',
      border: '2px solid rgba(251, 191, 36, 0.6)',
      borderRadius: '16px',
      padding: '1rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      zIndex: 100,
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(251, 191, 36, 0.3)',
      minWidth: '300px',
    }}>
      <div style={{
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#fbbf24',
        textAlign: 'center',
      }}>
        {allRoles.find(r => r.id === activeAction.role)?.icon} {activeAction.action}
      </div>
      
      <div style={{
        fontSize: '0.75rem',
        color: '#8b7355',
        textAlign: 'center',
      }}>
        {activeAction.type.includes('two') 
          ? `Sélectionnez 2 joueurs (${selectedTargets.length}/2)`
          : 'Sélectionnez un joueur'}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          style={{
            background: 'rgba(74, 222, 128, 0.2)',
            border: '1px solid rgba(74, 222, 128, 0.5)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            color: '#4ade80',
            cursor: canConfirm ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            opacity: canConfirm ? 1 : 0.5,
          }}
        >
          ✓ Confirmer
        </button>
        
        <button
          onClick={onCancel}
          style={{
            background: 'rgba(255, 107, 107, 0.2)',
            border: '1px solid rgba(255, 107, 107, 0.4)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            color: '#ff6b6b',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
          }}
        >
          ✕ Annuler
        </button>
      </div>
    </div>
  );
}

export default ActionControlPanel;
```

---

## Template JournalPanel.jsx

```javascript
import React from 'react';

function JournalPanel({ nightLog }) {
  return (
    <div style={{
      flex: 1,
      padding: '1rem',
      overflowY: 'auto',
    }}>
      <h2 style={{
        margin: '0 0 1rem 0',
        fontSize: '0.9rem',
        fontFamily: '"Cinzel", serif',
        color: '#c9a55c',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span>📖</span> Journal
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[...nightLog].reverse().map((night) => (
          <div key={night.night}>
            <div style={{
              fontSize: '0.7rem',
              fontFamily: '"Cinzel", serif',
              color: '#8b4545',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{
                flex: 1,
                height: '1px',
                background: 'linear-gradient(90deg, rgba(139, 69, 69, 0.4) 0%, transparent 100%)',
              }} />
              <span>Nuit {night.night}</span>
              <span style={{
                flex: 1,
                height: '1px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(139, 69, 69, 0.4) 100%)',
              }} />
            </div>
            
            {night.events.length === 0 ? (
              <p style={{
                fontSize: '0.75rem',
                color: '#555',
                fontStyle: 'italic',
                margin: 0,
                textAlign: 'center',
              }}>
                Aucun événement
              </p>
            ) : (
              night.events.map((event, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '0.6rem',
                    fontSize: '0.8rem',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span style={{
                    color: '#555',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                  }}>
                    {event.time}
                  </span>
                  <span style={{ 
                    color: event.isFalse ? '#ff6b6b' : '#b8a88a', 
                    lineHeight: 1.3,
                    fontStyle: event.isFalse ? 'italic' : 'normal',
                  }}>
                    {event.text}
                    {event.isFalse && (
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        fontSize: '0.7rem',
                        opacity: 0.7 
                      }}>
                        ⚠️
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default JournalPanel;
```

---

## Template NightOrderPanel.jsx

```javascript
import React from 'react';
import { allRoles } from '../data/roles';
import { getRoleCategory, getCategoryColor, getActionType } from '../utils/roleUtils';

function NightOrderPanel({
  currentTime,
  currentNight,
  nightOrder,
  completedActions,
  players,
  onStartAction,
  onExecutePlayer,
  onSkipExecution,
  onStartNewDay,
}) {
  const currentOrder = currentTime === 'JOUR' 
    ? nightOrder.day 
    : (currentNight === 1 ? nightOrder.first : nightOrder.other);
  
  const activeRoles = players.filter(p => p.alive).map(p => p.role);

  const renderDayActions = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Actions du jour */}
      {currentOrder.map((step, index) => {
        const role = step.role ? allRoles.find(r => r.id === step.role) : null;
        const category = step.role ? getRoleCategory(step.role) : null;
        const colors = category ? getCategoryColor(category) : null;
        const isActive = step.role === null || activeRoles.includes(step.role);
        const actionKey = `${step.role || 'special'}-${index}`;
        const isCompleted = completedActions.includes(actionKey);

        return (
          <div key={index} /* Rendu de l'action */ />
        );
      })}

      {/* Section exécution */}
      <div style={{ /* Boutons d'exécution */ }}>
        {players.filter(p => p.alive).map(p => (
          <button key={p.id} onClick={() => onExecutePlayer(p.id)}>
            {p.name}
          </button>
        ))}
      </div>

      <button onClick={onSkipExecution}>Pas d'exécution</button>
    </div>
  );

  const renderNightActions = () => (
    <div>
      {currentOrder.map((step, index) => {
        // Même logique que pour le jour
      })}
      {players.length >= 5 && (
        <button onClick={onStartNewDay}>☀️ Nouvelle Journée</button>
      )}
    </div>
  );

  return (
    <div style={{
      flex: 1,
      padding: '1rem',
      overflowY: 'auto',
      borderBottom: '1px solid rgba(139, 69, 69, 0.2)',
    }}>
      <h2 style={{
        margin: '0 0 1rem 0',
        fontSize: '0.9rem',
        fontFamily: '"Cinzel", serif',
        color: '#c9a55c',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        <span>{currentTime === 'JOUR' ? '☀️' : '🌙'}</span> 
        {currentTime === 'JOUR' ? 'Actions du Jour' : `Ordre de Nuit ${currentNight === 1 ? '(1ère)' : ''}`}
      </h2>

      {currentTime === 'JOUR' ? renderDayActions() : renderNightActions()}
    </div>
  );
}

export default NightOrderPanel;
```

---

## Template Sidebar.jsx

```javascript
import React from 'react';
import NightOrderPanel from './NightOrderPanel';
import JournalPanel from './JournalPanel';

function Sidebar({
  currentTime,
  currentNight,
  nightLog,
  completedActions,
  players,
  nightOrder,
  onStartAction,
  onExecutePlayer,
  onSkipExecution,
  onStartNewDay,
}) {
  return (
    <aside
      className="sidebar-section"
      style={{
        width: '360px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderLeft: '1px solid rgba(139, 69, 69, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <NightOrderPanel
        currentTime={currentTime}
        currentNight={currentNight}
        nightOrder={nightOrder}
        completedActions={completedActions}
        players={players}
        onStartAction={onStartAction}
        onExecutePlayer={onExecutePlayer}
        onSkipExecution={onSkipExecution}
        onStartNewDay={onStartNewDay}
      />

      <JournalPanel nightLog={nightLog} />
    </aside>
  );
}

export default Sidebar;
```

---

## Template GrimoireSection.jsx

```javascript
import React from 'react';
import PlayerToken from './PlayerToken';
import StatusCard from './StatusCard';

function GrimoireSection({
  containerRef,
  players,
  playerPositions,
  containerSize,
  selectedPlayerId,
  activeAction,
  selectedTargets,
  currentTime,
  currentNight,
  showAddPlayer,
  newPlayerName,
  draggingPlayerId,
  touchOffset,
  onDrop,
  onDragOver,
  onSelectPlayer,
  onSelectTarget,
  onUpdatePlayer,
  onRemovePlayer,
  onAddPlayer,
  onShowAddPlayer,
  onSetNewPlayerName,
  setDraggingPlayerId,
  setTouchOffset,
  setPlayerPositions,
}) {
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  return (
    <section
      className="grimoire-section"
      ref={containerRef}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        flex: 1,
        position: 'relative',
        minHeight: '500px',
        overflow: 'hidden',
      }}
      onClick={() => onSelectPlayer(null)}
    >
      {/* Backgrounds jour/nuit */}
      <div className="day-background" /* ... */ />
      <div className="night-background" /* ... */ />

      {/* Cercle central */}
      <div style={{ /* Cercle central avec compteur */ }}>
        <span>⚰️</span>
        <span>{players.filter(p => p.alive).length} / {players.length}</span>
      </div>

      {/* Tokens des joueurs */}
      {players.map((player, index) => {
        const isTargetable = /* logique de targetable */;
        
        return (
          <PlayerToken
            key={player.id}
            player={player}
            /* ... toutes les props */
          />
        );
      })}

      {/* Bouton ajouter joueur */}
      {(players.length < 15 && currentTime === 'NUIT' && currentNight === 1) && (
        <button onClick={() => onShowAddPlayer(true)}>
          + Ajouter un joueur
        </button>
      )}

      {/* Modal ajout joueur */}
      {showAddPlayer && (
        <div /* ... */ />
      )}

      {/* StatusCard */}
      {selectedPlayer && (
        <StatusCard
          player={selectedPlayer}
          players={players}
          onUpdate={onUpdatePlayer}
          onClose={() => onSelectPlayer(null)}
          onRemove={onRemovePlayer}
          style={{ /* positionnement */ }}
        />
      )}
    </section>
  );
}

export default GrimoireSection;
```

---

## 🎯 Utilisation

1. Copiez le template correspondant
2. Complétez les parties manquantes (`/* ... */`)
3. Ajoutez les styles inline du fichier original
4. Testez le composant

## 📝 Notes

- Tous ces templates sont **incomplets volontairement**
- Référez-vous au **fichier original** pour les styles et détails
- Utilisez **EXTRACTION_GUIDE.md** pour localiser le code exact