import React from 'react';

function VictoryModal({ winner, reason, onRestart, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: winner === 'village' 
            ? 'linear-gradient(145deg, rgba(26, 46, 26, 0.98) 0%, rgba(13, 26, 13, 0.99) 100%)'
            : 'linear-gradient(145deg, rgba(46, 26, 26, 0.98) 0%, rgba(26, 13, 13, 0.99) 100%)',
          border: `3px solid ${winner === 'village' ? '#4ade80' : '#ff6b6b'}`,
          borderRadius: '24px',
          padding: '3rem 2rem',
          maxWidth: '500px',
          width: '90%',
          boxShadow: winner === 'village'
            ? '0 20px 60px rgba(74, 222, 128, 0.3)'
            : '0 20px 60px rgba(255, 107, 107, 0.3)',
          textAlign: 'center',
          animation: 'victoryPulse 2s ease-in-out infinite',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          fontSize: '5rem',
          marginBottom: '1.5rem',
          animation: 'bounce 1s ease-in-out infinite',
        }}>
          {winner === 'village' ? '🏛️' : '👺'}
        </div>

        <h2 style={{
          margin: '0 0 1rem 0',
          fontSize: '2.5rem',
          fontFamily: '"Cinzel", serif',
          color: winner === 'village' ? '#4ade80' : '#ff6b6b',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          textShadow: winner === 'village'
            ? '0 0 20px rgba(74, 222, 128, 0.5)'
            : '0 0 20px rgba(255, 107, 107, 0.5)',
        }}>
          {winner === 'village' ? 'Victoire du Village !' : 'Victoire du Mal !'}
        </h2>

        <p style={{
          margin: '0 0 2rem 0',
          fontSize: '1.1rem',
          color: '#e8e0d5',
          lineHeight: 1.6,
        }}>
          {reason}
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={onRestart}
            style={{
              background: winner === 'village'
                ? 'rgba(74, 222, 128, 0.2)'
                : 'rgba(255, 107, 107, 0.2)',
              border: `2px solid ${winner === 'village' ? '#4ade80' : '#ff6b6b'}`,
              borderRadius: '12px',
              padding: '1rem 2rem',
              color: winner === 'village' ? '#4ade80' : '#ff6b6b',
              cursor: 'pointer',
              fontFamily: '"Cinzel", serif',
              fontSize: '1rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              transition: 'all 0.3s ease',
            }}
          >
            🔄 Nouvelle Partie
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(100, 100, 100, 0.2)',
              border: '2px solid #666',
              borderRadius: '12px',
              padding: '1rem 2rem',
              color: '#999',
              cursor: 'pointer',
              fontFamily: '"Cinzel", serif',
              fontSize: '1rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              transition: 'all 0.3s ease',
            }}
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}

export default VictoryModal;