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
      // Coin du grimoire : le cercle de tokens n'y passe pas, aucun joueur n'est masqué
      position: 'absolute',
      top: '5rem',
      left: '1rem',
      background: 'rgba(26, 26, 46, 0.98)',
      border: '2px solid rgba(251, 191, 36, 0.6)',
      borderRadius: '16px',
      padding: '1rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      zIndex: 100,
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(251, 191, 36, 0.3)',
      width: '300px',
      maxWidth: 'calc(100vw - 2rem)',
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
