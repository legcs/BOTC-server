import React, { useState } from 'react';
import { globalStyles } from '../styles/globalStyles';

const cardStyle = {
  flex: '1 1 260px',
  maxWidth: '340px',
  background: 'rgba(26, 26, 46, 0.9)',
  border: '1px solid rgba(201, 165, 92, 0.4)',
  borderRadius: '16px',
  padding: '1.5rem',
  color: '#e8e0d5',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'left',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
};

// Premier écran : le Conteur choisit comment il veut mener la partie
function ModeSelect({ onLocal, onMulti }) {
  const [code, setCode] = useState('');
  const cleanCode = code.trim().toUpperCase();

  const join = (e) => {
    e.preventDefault();
    if (cleanCode) window.location.search = `?room=${encodeURIComponent(cleanCode)}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: '"Crimson Text", Georgia, serif',
      color: '#e8e0d5',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      padding: '2rem 1rem',
    }}>
      <style>{globalStyles}</style>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          margin: 0, fontFamily: '"Cinzel", serif', fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#c9a55c',
        }}>
          Grimoire du Conteur
        </h1>
        <p style={{ margin: '0.5rem 0 0', color: '#8b7355' }}>Blood on the Clocktower — comment voulez-vous jouer ?</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', justifyContent: 'center', width: '100%', maxWidth: '720px' }}>
        <button className="mode-local" onClick={onLocal} style={cardStyle}>
          <span style={{ fontSize: '2rem' }}>📖</span>
          <strong style={{ fontFamily: '"Cinzel", serif', fontSize: '1.15rem', color: '#c9a55c' }}>Partie locale</strong>
          <span style={{ color: '#b8a88a', lineHeight: 1.4 }}>
            Un seul écran, celui du Conteur. Le grimoire reste secret et les joueurs sont autour de la table.
          </span>
        </button>

        <button className="mode-multi" onClick={onMulti} style={{ ...cardStyle, border: '1px solid rgba(74, 222, 128, 0.5)' }}>
          <span style={{ fontSize: '2rem' }}>🌐</span>
          <strong style={{ fontFamily: '"Cinzel", serif', fontSize: '1.15rem', color: '#4ade80' }}>Partie multijoueur</strong>
          <span style={{ color: '#b8a88a', lineHeight: 1.4 }}>
            Chaque joueur rejoint le salon depuis son navigateur : rôle secret, vue adaptée à son rôle, choix de ses cibles et discussion.
          </span>
        </button>
      </div>

      <form onSubmit={join} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
        <label htmlFor="join-code" style={{ color: '#8b7355' }}>Vous êtes joueur ? Entrez le code du salon :</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={4}
            placeholder="ABCD"
            style={{
              width: '7rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.3em',
              background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(139, 69, 69, 0.4)', borderRadius: '8px',
              padding: '0.6rem', color: '#e8e0d5', fontFamily: 'inherit', fontSize: '1.1rem',
            }}
          />
          <button
            type="submit"
            disabled={!cleanCode}
            style={{
              background: 'rgba(74, 158, 255, 0.2)', border: '1px solid rgba(74, 158, 255, 0.4)', borderRadius: '8px',
              padding: '0.6rem 1.2rem', color: '#4a9eff', cursor: cleanCode ? 'pointer' : 'not-allowed',
              opacity: cleanCode ? 1 : 0.5, fontFamily: 'inherit', fontSize: '1rem',
            }}
          >
            Rejoindre
          </button>
        </div>
      </form>
    </div>
  );
}

export default ModeSelect;
