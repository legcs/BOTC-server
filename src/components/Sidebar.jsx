import React, { useState } from 'react';
import NightOrderPanel from './NightOrderPanel';
import JournalPanel from './JournalPanel';
import ChatPanel from './ChatPanel';

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
  multiplayer = null,
}) {
  // En multijoueur, le bas de la barre alterne entre le journal et la discussion
  const [tab, setTab] = useState('journal');
  const [readCount, setReadCount] = useState(0);
  const messageCount = multiplayer?.chat.length ?? 0;
  const unread = tab === 'chat' ? 0 : Math.max(0, messageCount - readCount);
  const online = multiplayer?.roster.filter(p => p.online).length ?? 0;

  const tabStyle = (active) => ({
    flex: 1,
    padding: '0.35rem 0.5rem',
    background: active ? 'rgba(201, 165, 92, 0.2)' : 'transparent',
    border: `1px solid ${active ? 'rgba(201, 165, 92, 0.5)' : 'rgba(139, 69, 69, 0.3)'}`,
    borderRadius: '6px',
    color: active ? '#c9a55c' : '#8b7355',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
  });

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
          multiplayer={!!multiplayer}
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
        {multiplayer && (
          <div style={{ display: 'flex', gap: '0.4rem', padding: '0 1rem 0.5rem' }}>
            <button style={tabStyle(tab === 'journal')} onClick={() => setTab('journal')}>📖 Journal</button>
            <button
              style={tabStyle(tab === 'chat')}
              onClick={() => { setTab('chat'); setReadCount(messageCount); }}
            >
              💬 Discussion{unread > 0 ? ` (${unread})` : ''}
            </button>
          </div>
        )}
        {multiplayer && tab === 'chat' ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 1rem 1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#8b7355', marginBottom: '0.4rem' }}>
              {online} joueur{online > 1 ? 's' : ''} connecté{online > 1 ? 's' : ''}
            </div>
            <ChatPanel
              messages={multiplayer.chat}
              selfId="host"
              recipients={multiplayer.recipients}
              onSend={multiplayer.onSendChat}
            />
          </div>
        ) : (
          <JournalPanel nightLog={nightLog} />
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
