import React from 'react';

function Header({
  currentTime,
  currentNight,
  onAssignRoles,
  onToggleHelp,
  onToggleFullscreen,
  isFullscreen,
  roleAssigned,
  restartGame,
  completedActions,
  isStarted,
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
      <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        {/* Titre */}
        <div
          className='title'>
          <h1 
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #c9a55c 0%, #f4e4ba 50%, #c9a55c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Blood on the Clocktower
          </h1>
          <h1 style={{
            margin: 0,
            marginLeft: '1.5rem',
            fontSize: '1.25rem',
            fontWeight: '600',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #c9a55c 0%, #f4e4ba 50%, #c9a55c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Grimoire du Conteur
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
          {roleAssigned && !isStarted && (
            <button
              className='btn btn-reassign'
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
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              Réassigner les rôles
            </button>
          )}

          {/* Bouton Restart */}
          {isStarted && (
            <button
              className='btn btn-restart'
              onClick={restartGame}
              style={{
                background: 'linear-gradient(135deg, #2d1f3d 0%, #1a1a2e 100%)',
                border: '1px solid rgba(157, 78, 221, 0.4)',
                borderRadius: '8px',
                padding: '0.4rem 0.8rem',
                color: '#b794f4',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              Recommencer
            </button>
          )}

          {/* Bouton Aide */}
          <button
            className='btn btn-help'
            onClick={onToggleHelp}
            title="Aide et règles du jeu"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #1a1a2e 100%)',
              border: '1px solid rgba(201, 165, 92, 0.4)',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              color: '#c9a55c',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            ?
          </button>

          {/* Bouton Fullscreen */}
          <button
          
            className='btn btn-fullscreen'
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Quitter le plein écran (ESC)' : 'Mode plein écran'}
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #1a1a2e 100%)',
              border: '1px solid rgba(74, 158, 255, 0.4)',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              color: '#4a9eff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            ⛶
          </button>
        </div>
      </div>
    </header >
  );
}

export default Header;
