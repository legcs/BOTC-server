import React, { useEffect, useRef, useState } from 'react';
import { allRoles } from '../data/roles';
import { getCategoryColor, getRoleCategory } from '../utils/roleUtils';
import { calculateCirclePositions } from '../utils/positionUtils';
import { globalStyles } from '../styles/globalStyles';
import ChatPanel from '../components/ChatPanel';
import BluffBadges from '../components/BluffBadges';
import { useRelay } from './useRelay';
import { loadSeat, saveSeat } from './session';
import { categoryLabel } from './views';
import { formatCountdown } from './voting';

const JOIN_ERRORS = {
  'no-room': 'Ce salon n\'existe pas. Vérifiez le code auprès du Conteur.',
  'name-required': 'Entrez votre nom.',
  'name-taken': 'Ce nom est déjà pris dans ce salon.',
  closed: 'La partie a déjà commencé : le salon n\'accepte plus de nouveaux joueurs.',
  full: 'Le salon est complet (15 joueurs).',
};

const roleOf = (id) => allRoles.find((r) => r.id === id);

const panelStyle = {
  background: 'rgba(10, 10, 20, 0.8)',
  border: '1px solid rgba(139, 69, 69, 0.3)',
  borderRadius: '10px',
  padding: '0.9rem 1rem',
};

const titleStyle = {
  margin: '0 0 0.6rem 0',
  fontFamily: '"Cinzel", serif',
  fontSize: '1rem',
  color: '#c9a55c',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

// Jeton d'un joueur vu par un autre joueur : le rôle n'apparaît que s'il est connu
function PublicToken({ player, info, isMe, position, size, selectable, selected, bluffs, onClick }) {
  const role = info?.role ? roleOf(info.role) : null;
  // Un complice dont on sait seulement qu'il est Sbire
  const team = !role && info?.team === 'minion' ? 'minion' : null;
  const colors = getCategoryColor(role ? getRoleCategory(role.id) : team ?? 'unknown');
  const border = selected ? '#fbbf24' : player.alive ? colors.primary : '#444';

  return (
    <div
      className={`seat${isMe ? ' seat-me' : ''}${selected ? ' seat-selected' : ''}`}
      data-name={player.name}
      data-alive={player.alive}
      data-role={info?.role ?? ''}
      data-team={team ?? ''}
      onClick={selectable ? onClick : undefined}
      style={{
        position: 'absolute',
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: selectable ? 'pointer' : 'default',
        zIndex: selected ? 20 : 10,
      }}
    >
      <div style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: player.alive
          ? `radial-gradient(circle at 30% 30%, ${colors.secondary}, #0d0d1a 70%)`
          : 'radial-gradient(circle at 30% 30%, #2a2a2a, #0d0d0d 70%)',
        border: `3px solid ${border}`,
        boxShadow: selected
          ? '0 0 22px rgba(251, 191, 36, 0.7)'
          : selectable ? '0 0 16px rgba(251, 191, 36, 0.35)' : player.alive ? `0 0 16px ${colors.glow}` : 'none',
        outline: isMe ? '2px dashed #c9a55c' : 'none',
        outlineOffset: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {role?.image ? (
          <img
            src={role.image}
            alt={role.name}
            style={{ width: size * 0.6, height: size * 0.6, objectFit: 'contain', filter: player.alive ? 'none' : 'grayscale(1)', opacity: player.alive ? 1 : 0.5 }}
          />
        ) : (
          <span style={{ fontSize: size * 0.35, opacity: player.alive ? 0.8 : 0.4 }}>{role?.icon ?? '❔'}</span>
        )}
        <div style={{ position: 'absolute', top: -4, right: -4, display: 'flex', flexDirection: 'column', gap: 2, fontSize: size * 0.2 }}>
          {!player.alive && <span>💀</span>}
          {!player.alive && player.ghostUsed === false && <span className="ghost-vote" title="Dispose encore de son vote">🗳️</span>}
          {info?.poisoned && <span>☠️</span>}
          {info?.ivre && <span>🍺</span>}
          {info?.protected && <span>🛡️</span>}
          {info?.master && <span>👑</span>}
          {info?.decoy && <span>❓</span>}
        </div>
        <BluffBadges bluffs={bluffs} tokenSize={size} />
      </div>
      <div style={{
        marginTop: 2,
        fontSize: Math.max(14, size * 0.2),
        fontWeight: 600,
        color: player.alive ? '#e8e0d5' : '#999',
        textShadow: '0 1px 3px #000, 0 0 8px #000',
        whiteSpace: 'nowrap',
      }}>
        {player.name}{isMe ? ' (vous)' : ''}
      </div>
      {(role || team) && !isMe && (
        <div className="seat-role" style={{ fontSize: Math.max(11, size * 0.15), color: colors.primary, textShadow: '0 1px 3px #000', whiteSpace: 'nowrap' }}>
          {role ? role.name : 'Sbire'}
        </div>
      )}
    </div>
  );
}

function JoinForm({ room, error, status, onJoin }) {
  const [name, setName] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) onJoin(name.trim()); }}
      style={{ ...panelStyle, width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1.5rem' }}
    >
      <h2 style={{ ...titleStyle, margin: 0 }}>Rejoindre le salon {room}</h2>
      <input
        autoFocus
        value={name}
        maxLength={20}
        onChange={(e) => setName(e.target.value)}
        placeholder="Votre nom..."
        style={{
          background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(139, 69, 69, 0.4)', borderRadius: '8px',
          padding: '0.7rem 1rem', color: '#e8e0d5', fontFamily: 'inherit', fontSize: '1rem',
        }}
      />
      <button
        type="submit"
        disabled={!name.trim() || status !== 'online'}
        style={{
          background: 'rgba(74, 222, 128, 0.2)', border: '1px solid rgba(74, 222, 128, 0.5)', borderRadius: '8px',
          padding: '0.7rem', color: '#4ade80', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem',
          opacity: name.trim() && status === 'online' ? 1 : 0.5,
        }}
      >
        {status === 'online' ? 'Rejoindre la partie' : 'Connexion au serveur…'}
      </button>
      {error && <p className="join-error" style={{ margin: 0, color: '#ff8a8a' }}>{error}</p>}
      <a href={window.location.pathname} style={{ color: '#8b7355', fontSize: '0.9rem', textAlign: 'center' }}>← Retour au menu</a>
    </form>
  );
}

// Vue d'un joueur connecté à une partie multijoueur
export default function PlayerApp({ room }) {
  const [seat, setSeat] = useState(() => loadSeat(room));
  const [pub, setPub] = useState(null);
  const [view, setView] = useState(null);
  const [hostOnline, setHostOnline] = useState(true);
  const [chat, setChat] = useState([]);
  const [error, setError] = useState(null);
  const [kicked, setKicked] = useState(false);
  // Choix en cours, rattaché à la demande à laquelle il répond
  const [pick, setPick] = useState({ action: null, ids: [] });
  const [size, setSize] = useState({ width: 600, height: 500 });
  // Écart entre l'horloge du Conteur et la nôtre, pour afficher le même compte à rebours
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const circleRef = useRef(null);

  const relay = useRelay({
    // Un joueur déjà installé reprend sa place avec sa clé
    hello: () => (seat ? { t: 'join', room, key: seat.key, name: seat.name } : null),
    onMessage: (msg) => {
      if (msg.t === 'joined') {
        const next = { key: msg.key, name: msg.name };
        saveSeat(room, next);
        setSeat(next);
        setError(null);
      } else if (msg.t === 'view') {
        setPub(msg.public);
        setView(msg.view);
        setHostOnline(msg.hostOnline);
        if (msg.hostNow) setClockOffset(msg.hostNow - Date.now());
      } else if (msg.t === 'history') {
        setChat(msg.messages);
      } else if (msg.t === 'chat') {
        setChat((prev) => [...prev, msg.message]);
      } else if (msg.t === 'kicked') {
        saveSeat(room, null);
        setKicked(true);
      } else if (msg.t === 'error' && msg.code !== 'chat-closed') {
        // Clé inconnue (salon recréé) : on repasse par le formulaire
        saveSeat(room, null);
        setSeat(null);
        setError(JOIN_ERRORS[msg.code] ?? 'Connexion impossible.');
      }
    },
  });

  useEffect(() => {
    if (!circleRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(circleRef.current);
    return () => observer.disconnect();
  }, [seat, kicked]);

  const debating = pub?.day?.phase === 'debate';
  useEffect(() => {
    if (!debating) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [debating]);

  const shell = (children) => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: '"Crimson Text", Georgia, serif',
      color: '#e8e0d5',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{globalStyles}</style>
      {children}
    </div>
  );

  const centered = (children) => shell(
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>{children}</div>,
  );

  if (kicked) {
    return centered(
      <div style={{ ...panelStyle, textAlign: 'center', padding: '1.5rem' }}>
        <p>Le Conteur vous a retiré de la partie.</p>
        <a href={window.location.pathname} style={{ color: '#4a9eff' }}>Retour au menu</a>
      </div>,
    );
  }

  if (!seat) {
    return centered(
      <JoinForm room={room} error={error} status={relay.status} onJoin={(name) => relay.send({ t: 'join', room, name })} />,
    );
  }

  const players = pub?.players ?? [];
  const prompt = view?.prompt ?? null;
  const day = pub?.day ?? null;
  const ballot = view?.ballot ?? null;
  const nominees = !prompt && ballot ? ballot.nominees : [];
  // Ce que le joueur est en train de désigner : les cibles de sa capacité, ou le joueur qu'il nomine
  const picking = prompt
    ? { key: prompt.action, count: prompt.count, selectable: prompt.selectable }
    : nominees.length > 0 ? { key: 'nominate', count: 1, selectable: nominees } : null;
  const picked = picking && pick.action === picking.key ? pick.ids : [];
  // Un choix déjà transmis au Conteur reste affiché
  const selection = prompt ? (picked.length > 0 ? picked : prompt.chosen) : picked;
  const myRole = view?.role ? roleOf(view.role) : null;
  const roleColors = getCategoryColor(myRole ? getRoleCategory(myRole.id) : 'unknown');
  // Hauteur réduite : le nom et le rôle s'affichent sous chaque jeton
  const positions = calculateCirclePositions(players, { width: size.width, height: size.height - 44 });
  const tokenSize = Math.max(54, Math.min(84, Math.min(size.width, size.height) / 6.5));
  const me = players.find((p) => p.id === view?.id);

  const togglePick = (id) => {
    if (!picking) return;
    const current = selection;
    let next;
    if (current.includes(id)) next = current.filter((x) => x !== id);
    else if (picking.count === 1) next = [id];
    else next = current.length < 2 ? [...current, id] : [current[1], id];
    setPick({ action: picking.key, ids: next });
  };

  const submitPick = () => {
    relay.send({ t: 'targets', ids: selection });
    setPick({ action: null, ids: [] });
  };

  const submitNomination = () => {
    relay.send({ t: 'act', kind: 'nominate', id: picked[0] });
    setPick({ action: null, ids: [] });
  };

  const nameOf = (id) => players.find((p) => p.id === id)?.name ?? '?';
  // Bluffs à afficher à côté d'un jeton : ceux que le Démon a transmis à ce Sbire (vue du Démon),
  // ou ceux que l'on a soi-même reçus (vue du Sbire)
  const bluffsOf = (id) => {
    if (!view) return [];
    if (id === view.id) return view.sharedBluffs;
    return view.bluffs.filter((role) => view.bluffShares[role]?.includes(id));
  };
  const voteButton = (color) => ({
    background: `${color}33`, border: `1px solid ${color}`, borderRadius: '8px', padding: '0.5rem 1.4rem',
    color, cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem',
  });

  const phaseLabel = !pub?.rolesAssigned
    ? 'En attente du Conteur'
    : `${pub.phase === 'NUIT' ? '🌙 Nuit' : '☀️ Jour'} ${pub.night}`;

  return shell(
    <>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem',
        padding: '0.7rem 1rem', background: 'rgba(0, 0, 0, 0.6)', borderBottom: '1px solid rgba(139, 69, 69, 0.3)',
      }}>
        <strong style={{ fontFamily: '"Cinzel", serif', color: '#c9a55c', letterSpacing: '0.1em' }}>
          {seat.name} · Salon {room}
        </strong>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {(relay.status !== 'online' || !hostOnline) && (
            <span className="connection-warning" style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
              {relay.status !== 'online' ? 'Reconnexion…' : 'Conteur déconnecté'}
            </span>
          )}
          <span className="phase" style={{
            background: 'rgba(139, 69, 69, 0.2)', border: '1px solid rgba(139, 69, 69, 0.4)', borderRadius: '8px',
            padding: '0.3rem 0.7rem', fontFamily: '"Cinzel", serif', color: '#c9a55c',
          }}>
            {phaseLabel}
          </span>
        </div>
      </header>

      {pub?.gameEnd && (
        <div className="game-end" style={{
          padding: '0.8rem 1rem', textAlign: 'center', fontFamily: '"Cinzel", serif', fontSize: '1.1rem',
          background: pub.gameEnd.winner === 'village' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 107, 107, 0.15)',
          color: pub.gameEnd.winner === 'village' ? '#4ade80' : '#ff6b6b',
        }}>
          {pub.gameEnd.winner === 'village' ? 'Victoire du Village !' : 'Victoire du Mal !'}
          <div style={{ fontFamily: 'inherit', fontSize: '0.9rem', color: '#d8d0c5' }}>{pub.gameEnd.reason}</div>
        </div>
      )}

      <main className="player-layout" style={{ flex: 1, display: 'flex', flexWrap: 'wrap', minHeight: 0 }}>
        <section style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', minHeight: '420px' }}>
          {prompt && (
            <div className="prompt" style={{
              margin: '0.75rem', padding: '0.75rem 1rem', borderRadius: '12px', textAlign: 'center',
              background: 'rgba(26, 26, 46, 0.98)', border: '2px solid rgba(251, 191, 36, 0.6)',
            }}>
              <div style={{ color: '#fbbf24', fontWeight: 600 }}>{prompt.action}</div>
              <div style={{ color: '#b8a88a', fontSize: '0.85rem', margin: '0.3rem 0 0.5rem' }}>
                Touchez {prompt.count === 2 ? `2 joueurs (${selection.length}/2)` : 'un joueur'} puis validez.
                {prompt.chosen.length === prompt.count && picked.length === 0 && ' Choix transmis au Conteur.'}
              </div>
              <button
                onClick={submitPick}
                disabled={picked.length !== prompt.count}
                style={{
                  background: 'rgba(74, 222, 128, 0.2)', border: '1px solid rgba(74, 222, 128, 0.5)', borderRadius: '8px',
                  padding: '0.45rem 1rem', color: '#4ade80', fontFamily: 'inherit', fontSize: '0.9rem',
                  cursor: picked.length === prompt.count ? 'pointer' : 'not-allowed',
                  opacity: picked.length === prompt.count ? 1 : 0.5,
                }}
              >
                ✓ Valider mon choix
              </button>
            </div>
          )}

          {day && !pub.gameEnd && (
            <div className="day-panel" style={{
              margin: '0.75rem', padding: '0.75rem 1rem', borderRadius: '12px', textAlign: 'center',
              background: 'rgba(26, 26, 46, 0.98)', border: '2px solid rgba(251, 191, 36, 0.6)',
              display: 'flex', flexDirection: 'column', gap: '0.45rem', alignItems: 'center',
            }}>
              {day.phase === 'debate' && (
                <div style={{ color: '#fbbf24', fontWeight: 600 }}>
                  ⏳ Débat en cours · <span className="countdown">{formatCountdown(day.endsAt - (now + clockOffset))}</span>
                </div>
              )}

              {day.phase === 'nominations' && !day.open && (
                <>
                  <div style={{ color: '#fbbf24', fontWeight: 600 }}>
                    🗳️ Nominations ouvertes · {day.threshold} voix nécessaires
                  </div>
                  {nominees.length > 0 ? (
                    <>
                      <div style={{ color: '#b8a88a', fontSize: '0.85rem' }}>Touchez le joueur que vous voulez nominer.</div>
                      <button
                        onClick={submitNomination}
                        disabled={picked.length !== 1}
                        style={{ ...voteButton('#fbbf24'), opacity: picked.length === 1 ? 1 : 0.5, cursor: picked.length === 1 ? 'pointer' : 'not-allowed' }}
                      >
                        {picked.length === 1 ? `Nominer ${nameOf(picked[0])}` : 'Nominer'}
                      </button>
                    </>
                  ) : (
                    <div style={{ color: '#b8a88a', fontSize: '0.85rem' }}>
                      {me?.alive ? 'Vous avez déjà nominé aujourd\'hui.' : 'Les morts ne nominent pas.'}
                    </div>
                  )}
                </>
              )}

              {day.open && (
                <>
                  <div style={{ color: '#fbbf24', fontWeight: 600 }}>
                    {nameOf(day.open.nominatorId)} nomine {nameOf(day.open.nomineeId)} — exécuter {nameOf(day.open.nomineeId)} ?
                  </div>
                  {ballot?.canVote && (
                    <>
                      <div className="my-turn" style={{ color: '#4ade80', fontWeight: 600 }}>C'est à vous de voter.</div>
                      {ballot.master && (
                        <div className="master-vote" style={{ color: '#b794f4', fontSize: '0.85rem' }}>
                          Votre Maître, {nameOf(ballot.master.id)}, {ballot.master.vote === null ? 'n\'a pas encore voté' : `a voté ${ballot.master.vote ? 'Oui' : 'Non'}`} : vous ne pouvez voter « Oui » que s'il l'a fait.
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          className="vote-yes"
                          disabled={!ballot.canVoteYes}
                          style={{ ...voteButton('#4ade80'), opacity: ballot.canVoteYes ? 1 : 0.4, cursor: ballot.canVoteYes ? 'pointer' : 'not-allowed' }}
                          onClick={() => relay.send({ t: 'act', kind: 'vote', value: true })}
                        >
                          Oui
                        </button>
                        <button className="vote-no" style={voteButton('#ff6b6b')} onClick={() => relay.send({ t: 'act', kind: 'vote', value: false })}>Non</button>
                      </div>
                      {ballot.ghost === 'available' && (
                        <div style={{ color: '#b794f4', fontSize: '0.85rem' }}>Vous êtes mort : un « Oui » utilisera votre unique vote.</div>
                      )}
                    </>
                  )}
                  {ballot && ballot.myVote !== null && (
                    <div className="my-vote" style={{ color: '#d8d0c5' }}>Vous avez voté {ballot.myVote ? 'Oui' : 'Non'}.</div>
                  )}
                  {ballot?.ghost === 'used' && (
                    <div className="no-vote" style={{ color: '#b8a88a', fontSize: '0.85rem' }}>Vous avez déjà utilisé votre vote de mort.</div>
                  )}
                  {day.open.voterId !== null && !ballot?.canVote && (
                    <div className="vote-turn" style={{ color: '#d8d0c5' }}>Au tour de {nameOf(day.open.voterId)} de voter.</div>
                  )}
                  <div className="vote-tally" style={{ color: '#b8a88a', fontSize: '0.85rem' }}>
                    Oui : {day.open.yes.length > 0 ? day.open.yes.map(nameOf).join(', ') : '—'} · Non : {day.open.no.length > 0 ? day.open.no.map(nameOf).join(', ') : '—'} · {day.threshold} voix nécessaires
                  </div>
                </>
              )}

              {day.results.map((result) => (
                <div key={result.id} className="vote-result" style={{ color: result.nomineeId === day.onBlockId ? '#ff8a8a' : '#b8a88a', fontSize: '0.9rem' }}>
                  {nameOf(result.nomineeId)} : {result.yes.length} voix
                  {result.yes.length > 0 && ` (${result.yes.map(nameOf).join(', ')})`}
                  {result.nomineeId === day.onBlockId && ' — condamné'}
                </div>
              ))}
            </div>
          )}

          <div
            ref={circleRef}
            className="player-circle"
            style={{
              flex: 1, position: 'relative', minHeight: '380px', overflow: 'hidden',
              backgroundImage: `url(/images/${pub?.phase === 'JOUR' ? 'day' : 'night'}.png)`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}
          >
            {players.length === 0 && (
              <p style={{ textAlign: 'center', marginTop: '3rem', color: '#b8a88a' }}>En attente du Conteur…</p>
            )}
            {players.map((p) => (
              <PublicToken
                key={p.id}
                player={p}
                info={view?.known[p.id] ?? null}
                isMe={p.id === view?.id}
                position={positions[p.id]}
                size={tokenSize}
                selectable={!!picking && picking.selectable.includes(p.id)}
                selected={selection.includes(p.id)}
                bluffs={bluffsOf(p.id)}
                onClick={() => togglePick(p.id)}
              />
            ))}
          </div>
        </section>

        <aside style={{ flex: '1 1 300px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', minWidth: 0 }}>
          <div className="my-role" style={{ ...panelStyle, borderColor: myRole ? roleColors.primary : panelStyle.border }}>
            <h2 style={titleStyle}>Votre rôle</h2>
            {!view && <p style={{ margin: 0, color: '#b8a88a' }}>Vous n'êtes pas encore installé dans le cercle.</p>}
            {view && !myRole && (
              <p style={{ margin: 0, color: '#b8a88a' }}>
                {players.length} joueur{players.length > 1 ? 's' : ''} dans le cercle. Le Conteur n'a pas encore distribué les rôles.
              </p>
            )}
            {myRole && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  {myRole.image && <img src={myRole.image} alt="" style={{ width: 48, height: 48 }} />}
                  <div>
                    <div className="role-name" style={{ fontSize: '1.3rem', fontWeight: 600, color: roleColors.primary }}>{myRole.name}</div>
                    <div className="role-team" style={{ fontSize: '0.85rem', color: '#b8a88a' }}>
                      {categoryLabel(myRole.id)} · camp du {view.team === 'evil' ? 'Mal' : 'Village'}
                      {me && !me.alive ? ' · mort' : ''}
                    </div>
                  </div>
                </div>
                <p style={{ margin: '0.6rem 0 0', color: '#d8d0c5', lineHeight: 1.4 }}>{myRole.description}</p>
                {view.grimoire && (
                  <p className="grimoire-note" style={{ margin: '0.5rem 0 0', color: '#ff8a8a', fontSize: '0.9rem' }}>
                    Grimoire consulté la nuit {view.grimoire.night} : les rôles et statuts du cercle sont ceux de ce moment-là.
                  </p>
                )}
                {view.bluffs.length > 0 && (
                  <div className="bluffs" style={{ margin: '0.6rem 0 0', color: '#b794f4', fontSize: '0.9rem' }}>
                    <div>Vos bluffs — rôles absents de la partie, que vous pouvez prétendre avoir ou transmettre à vos Sbires :</div>
                    {view.bluffs.map((id) => (
                      <div key={id} className="bluff" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
                        <strong style={{ color: '#e8e0d5' }}>{roleOf(id)?.name}</strong>
                        {view.minions.map((minionId) => {
                          const shared = view.bluffShares[id]?.includes(minionId) ?? false;
                          return (
                            <button
                              key={minionId}
                              className={`bluff-share${shared ? ' bluff-shared' : ''}`}
                              onClick={() => relay.send({ t: 'act', kind: 'bluff', role: id, id: minionId, value: !shared })}
                              style={{
                                background: shared ? 'rgba(157, 78, 221, 0.35)' : 'transparent',
                                border: '1px solid rgba(157, 78, 221, 0.6)', borderRadius: '6px', padding: '0.15rem 0.5rem',
                                color: '#b794f4', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem',
                              }}
                            >
                              {shared ? `✓ transmis à ${nameOf(minionId)}` : `→ ${nameOf(minionId)}`}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
                {view.sharedBluffs.length > 0 && (
                  <p className="shared-bluffs" style={{ margin: '0.5rem 0 0', color: '#b794f4', fontSize: '0.9rem' }}>
                    Bluffs transmis par le Démon (rôles absents de la partie) : {view.sharedBluffs.map((id) => roleOf(id)?.name).join(', ')}
                  </p>
                )}
              </>
            )}
          </div>

          {view && view.infos.length > 0 && (
            <div className="my-infos" style={panelStyle}>
              <h2 style={titleStyle}>Vos informations</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                {view.infos.map((info, index) => (
                  <div key={index} style={{ color: '#d8d0c5', lineHeight: 1.35 }}>
                    <span style={{ color: '#8b7355', fontSize: '0.8rem' }}>Nuit {info.night} · </span>{info.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ ...panelStyle, flex: 1, minHeight: '260px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={titleStyle}>Discussion</h2>
            <ChatPanel
              messages={chat}
              recipients={[
                { id: 'host', label: 'Conteur (privé)' },
                // Chuchoter à un autre joueur, comme un aparté autour de la table (le jour seulement)
                ...players.filter((p) => p.id !== view?.id).map((p) => ({ id: `p:${p.id}`, label: `${p.name} (chuchoter)`, dayOnly: true })),
              ]}
              publicOpen={pub?.chatOpen ?? true}
              onSend={(to, text) => relay.send({ t: 'chat', to, text })}
            />
          </div>
        </aside>
      </main>
    </>,
  );
}
