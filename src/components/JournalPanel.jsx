import React from 'react';

function JournalPanel({ nightLog }) {
  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem',
      maxHeight: '100%',
      backgroundColor: 'rgba(10, 10, 20, 0.8)',
      borderRadius: '8px',
      boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.3)',
    }}>
      <h2 style={{
        margin: '0 0 1rem 0',
        fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', // Taille adaptative
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

      <div 
      className='journal'
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
        fontSize: '0.9rem',
      }}>
        {[...nightLog].reverse().map((night) => (
          <div
            key={night.night}
            style={{
              padding: '0.8rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(20, 20, 30, 0.5)',
              borderLeft: '2px solid rgba(139, 69, 69, 0.6)',
            }}
          >
            {/* Titre de la nuit */}
            <div style={{
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              fontFamily: '"Cinzel", serif',
              color: '#8b4545',
              marginBottom: '0.7rem',
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

            {/* Événements de la nuit */}
            {night.events.length === 0 ? (
              <p style={{
                fontSize: '0.85rem',
                color: '#777',
                fontStyle: 'italic',
                margin: 0,
                textAlign: 'center',
                padding: '0.5rem',
              }}>
                Aucun événement
              </p>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}>
                {night.events.map((event, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '0.6rem',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '4px',
                      backgroundColor: event.isFalse ? 'rgba(139, 69, 69, 0.1)' : 'rgba(173, 168, 138, 0.05)',
                      borderLeft: event.isFalse ? '2px solid rgba(255, 107, 107, 0.4)' : '2px solid rgba(173, 168, 138, 0.3)',
                    }}
                  >
                    <span style={{
                      color: '#777',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap',
                    }}>
                      {event.time}
                    </span>
                    <span style={{
                      flex: 1,
                      color: event.isFalse ? '#ff8a8a' : '#b8a88a',
                      lineHeight: 1.4,
                      fontStyle: event.isFalse ? 'italic' : 'normal',
                      wordBreak: 'break-word', // Permet le retour à la ligne si nécessaire
                    }}>
                      {event.text}
                      {event.isFalse && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.8rem',
                          opacity: 0.7,
                        }}>
                          ⚠️
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default JournalPanel;
