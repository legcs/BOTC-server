import React from 'react';
import { formatCountdown } from '../multiplayer/voting';

const boxStyle = {
  background: 'rgba(26, 26, 46, 0.9)',
  border: '1px solid rgba(251, 191, 36, 0.4)',
  borderRadius: '8px',
  padding: '0.6rem 0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
  fontSize: '0.9rem',
};

const buttonStyle = {
  padding: '0.4rem 0.7rem',
  borderRadius: '6px',
  border: '1px solid rgba(251, 191, 36, 0.5)',
  background: 'rgba(251, 191, 36, 0.15)',
  color: '#fbbf24',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
};

// Suivi du débat, des nominations et des votes côté Conteur (partie multijoueur)
function DayVotePanel({ dayVote, players, onExecutePlayer }) {
  const { day, remaining, summary, open, voter } = dayVote;
  const yesIds = open ? open.order.filter((id) => open.votes[id] === true) : [];
  const noIds = open ? open.order.filter((id) => open.votes[id] === false) : [];
  const name = (id) => players.find((p) => p.id === id)?.name ?? '?';

  return (
    <div className="day-vote" style={boxStyle}>
      {day.phase === 'debate' ? (
        <>
          <div style={{ color: '#fbbf24', fontWeight: 600 }}>
            ⏳ Débat : <span className="countdown">{formatCountdown(remaining)}</span>
          </div>
          <button style={buttonStyle} onClick={dayVote.onOpenNominations}>Ouvrir les nominations</button>
        </>
      ) : (
        <div style={{ color: '#fbbf24', fontWeight: 600 }}>
          🗳️ Nominations ouvertes · {summary.threshold} voix nécessaires
        </div>
      )}

      {open && (
        <>
          <div style={{ color: '#e8e0d5' }}>
            {name(open.nominatorId)} nomine <strong>{name(open.nomineeId)}</strong>
          </div>
          <div className="vote-tally" style={{ color: '#b8a88a', fontSize: '0.85rem' }}>
            Oui : {yesIds.length > 0 ? yesIds.map(name).join(', ') : '—'} · Non : {noIds.length > 0 ? noIds.map(name).join(', ') : '—'}
          </div>
          {voter && (
            <div className="vote-turn" data-voter={voter.name} style={{ color: '#fbbf24' }}>
              Au tour de {voter.name}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {voter && <button style={{ ...buttonStyle, flex: 1 }} onClick={dayVote.onSkipVoter}>Passer (Non)</button>}
            <button style={{ ...buttonStyle, flex: 1 }} onClick={dayVote.onCloseVote}>Clore le vote</button>
          </div>
        </>
      )}

      {summary.results.map((result) => (
        <div key={result.id} className="vote-result" style={{ color: result.nomineeId === summary.onBlockId ? '#ff8a8a' : '#b8a88a', lineHeight: 1.3 }}>
          {name(result.nomineeId)} : {result.yes.length} voix
          {result.yes.length > 0 && ` (${result.yes.map(name).join(', ')})`}
        </div>
      ))}

      {summary.onBlockId !== null && !open && (
        <button
          style={{ ...buttonStyle, border: '1px solid #b13e3e', background: '#522323', color: '#fff' }}
          onClick={() => onExecutePlayer(summary.onBlockId)}
        >
          Exécuter {name(summary.onBlockId)}
        </button>
      )}
    </div>
  );
}

export default DayVotePanel;
