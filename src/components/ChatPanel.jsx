import React, { useEffect, useRef, useState } from 'react';

// Discussion d'une partie multijoueur, côté Conteur comme côté joueur.
// Un destinataire marqué `dayOnly` (chuchotement entre joueurs) n'est joignable que le jour.
function ChatPanel({ messages, recipients, viewer = 'player', publicOpen = true, onSend }) {
  const [text, setText] = useState('');
  const [to, setTo] = useState('all');
  const listRef = useRef(null);

  const options = [
    { id: 'all', label: publicOpen ? 'Tout le monde' : 'Tout le monde (fermé la nuit)', dayOnly: true },
    ...recipients,
  ];
  const reachable = (option) => !!option && (publicOpen || !option.dayOnly);
  // La discussion fermée, un joueur ne peut plus écrire qu'au Conteur
  const chosen = options.find((o) => o.id === to);
  const target = reachable(chosen) ? to : options.find(reachable)?.id ?? 'all';
  const canSend = text.trim() !== '' && reachable(options.find((o) => o.id === target));

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const submit = (e) => {
    e.preventDefault();
    if (!canSend) return;
    onSend(target, text.trim());
    setText('');
  };

  return (
    <div className="chat-panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div
        ref={listRef}
        className="chat-messages"
        style={{ flex: 1, minHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}
      >
        {messages.length === 0 && (
          <p style={{ color: '#777', fontStyle: 'italic', textAlign: 'center', margin: '0.5rem 0' }}>Aucun message</p>
        )}
        {messages.map((m) => {
          const { mine } = m;
          const isPrivate = m.private;
          return (
            <div
              key={m.id}
              className={`chat-message${isPrivate ? ' chat-private' : ''}`}
              style={{
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                background: isPrivate ? 'rgba(157, 78, 221, 0.12)' : 'rgba(173, 168, 138, 0.06)',
                borderLeft: `2px solid ${isPrivate ? 'rgba(157, 78, 221, 0.6)' : 'rgba(173, 168, 138, 0.3)'}`,
                lineHeight: 1.35,
                wordBreak: 'break-word',
              }}
            >
              <strong style={{ color: m.fromHost ? '#c9a55c' : '#4a9eff' }}>{mine ? 'Vous' : m.name}</strong>
              {isPrivate && (
                <span style={{ color: '#b794f4', fontSize: '0.75rem' }}>
                  {' '}(privé{mine || (m.toName && m.toName !== 'Conteur' && !m.fromHost && viewer === 'host') ? ` → ${m.toName}` : ''})
                </span>
              )}
              <span style={{ color: '#d8d0c5' }}> : {m.text}</span>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <select
          aria-label="Destinataire"
          value={target}
          onChange={(e) => setTo(e.target.value)}
          style={{
            background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(139, 69, 69, 0.3)', borderRadius: '6px',
            color: '#e8e0d5', padding: '0.3rem 0.5rem', fontFamily: 'inherit', fontSize: '0.85rem',
          }}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id} disabled={!reachable(o)}>{o.label}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <input
            type="text"
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder="Votre message..."
            style={{
              flex: 1, minWidth: 0, background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(139, 69, 69, 0.3)',
              borderRadius: '6px', padding: '0.45rem 0.6rem', color: '#e8e0d5', fontFamily: 'inherit', fontSize: '0.9rem',
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            style={{
              background: 'rgba(74, 158, 255, 0.2)', border: '1px solid rgba(74, 158, 255, 0.4)', borderRadius: '6px',
              padding: '0.45rem 0.8rem', color: '#4a9eff', cursor: canSend ? 'pointer' : 'not-allowed',
              opacity: canSend ? 1 : 0.5, fontFamily: 'inherit', fontSize: '0.9rem',
            }}
          >
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatPanel;
