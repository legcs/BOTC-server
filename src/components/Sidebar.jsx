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
  addNightEvent,
  onAutoAction,
  killedTonightId,
  roleAssigned,
  onAssignRoles,
  setIsStarted,
}) {
  return (
    <aside
      className="sidebar-section"
      style={{
        width: '100%',
        maxWidth: '360px', // Largeur maximale pour les grands écrans
        background: 'rgba(10, 10, 20, 0.7)',
        borderLeft: '1px solid rgba(139, 69, 69, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        height: '100%',
        boxShadow: 'inset -2px 0 10px rgba(0, 0, 0, 0.3)',
        borderRadius: '0 8px 8px 0', // Bordure arrondie à droite
      }}
    >
      {/* Panneau des actions de nuit/jour */}
      <div style={{
        flex: 1.5,
        minHeight: 0, // Permet au conteneur de s'étendre correctement
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
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
          addNightEvent={addNightEvent}
          onAutoAction={onAutoAction}
          killedTonightId={killedTonightId}
          roleAssigned={roleAssigned}
          onAssignRoles={onAssignRoles}
          setIsStarted={setIsStarted}
        />
      </div>

      {/* Panneau du journal */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid rgba(139, 69, 69, 0.2)',
        paddingTop: '0.5rem',
      }}>
        <JournalPanel nightLog={nightLog} />
      </div>
    </aside>
  );
}

export default Sidebar;
