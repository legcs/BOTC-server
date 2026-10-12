import React from 'react';

// Décision que le Conteur doit prendre pour résoudre une capacité
function ChoiceModal({ choice, onChoose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: '1rem',
    }}>
      <div className="choice-modal" style={{
        background: 'rgba(26, 26, 46, 0.98)', border: '2px solid rgba(251, 191, 36, 0.6)', borderRadius: '16px',
        padding: '1.25rem 1.5rem', maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>
        <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '1.05rem', textAlign: 'center' }}>{choice.title}</div>
        {choice.text && <div style={{ color: '#b8a88a', fontSize: '0.9rem', textAlign: 'center' }}>{choice.text}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '50vh', overflowY: 'auto' }}>
          {choice.options.map((option) => (
            <button
              key={option.label}
              onClick={() => onChoose(option)}
              style={{
                background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.45)', borderRadius: '8px',
                padding: '0.55rem 0.8rem', color: '#e8e0d5', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChoiceModal;
