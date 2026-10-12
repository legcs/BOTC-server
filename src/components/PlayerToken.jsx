import React from 'react';
import { allRoles } from '../data/roles';
import { getRoleCategory, getCategoryColor, getRoleName } from '../utils/roleUtils';

function PlayerToken({
  player,
  totalPlayers,
  onSelect,
  isSelected,
  position,
  containerSize,
  isTargetable,
  isTargeted,
  activeAction,
  draggingPlayerId,
  setDraggingPlayerId,
  touchOffset,
  setTouchOffset,
  setPlayerPositions
}) {
  const role = allRoles.find(r => r.id === player.role);
  const category = getRoleCategory(player.role);
  const colors = getCategoryColor(category);

  const tokenSize = Math.max(80, Math.min(90, containerSize.width / (totalPlayers * 0.8)));

  const safePosition = position &&
    typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    !isNaN(position.x) &&
    !isNaN(position.y)
    ? position
    : { x: containerSize.width / 2, y: containerSize.height / 2 };

  const handleTouchStart = (e) => {
    if (activeAction) return;

    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();

    setDraggingPlayerId(player.id);
    setTouchOffset({
      x: touch.clientX - rect.left - tokenSize / 2,
      y: touch.clientY - rect.top - tokenSize / 2
    });
  };

  const handleTouchMove = (e) => {
    if (draggingPlayerId !== player.id || activeAction) return;

    e.preventDefault();
    const touch = e.touches[0];
    const containerRect = e.currentTarget.parentElement.getBoundingClientRect();

    const newX = touch.clientX - containerRect.left - touchOffset.x;
    const newY = touch.clientY - containerRect.top - touchOffset.y;

    setPlayerPositions(prev => ({
      ...prev,
      [player.id]: { x: newX, y: newY }
    }));
  };

  const handleTouchEnd = () => {
    if (draggingPlayerId !== player.id) {
      // Si on n'est pas en train de déplacer le token, déclencher la sélection après un délai
      setTimeout(() => {
        if (!activeAction) {
          onSelect(player.id);
        }
      }, 50); // Délai de 50ms pour éviter les conflits
    }

    setDraggingPlayerId(null);
    setTouchOffset({ x: 0, y: 0 });
  };

  return (
    <div
      draggable={!activeAction}
      onDragStart={(e) => {
        if (activeAction) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('playerId', player.id.toString());
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        if (activeAction && isTargetable) {
          onSelect(player.id);
        } else if (!activeAction) {
          onSelect(player.id);
        }
      }}
      style={{
        position: 'absolute',
        left: safePosition.x - tokenSize / 2,
        top: safePosition.y - tokenSize / 2,
        width: tokenSize,
        height: tokenSize + 20, // Ajoute 20px pour le nom en dessous
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: activeAction ? (isTargetable ? 'pointer' : 'not-allowed') : 'grab',
        zIndex: isSelected || isTargeted || draggingPlayerId === player.id ? 100 : 10,
        transition: draggingPlayerId === player.id ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease',
        filter: activeAction && !isTargetable ? 'brightness(0.5)' : 'none',
        touchAction: 'none',
      }}
      className="player-token"
    >
      {/* Token (cercle) */}
      <div style={{
        position: 'relative',
        width: tokenSize,
        height: tokenSize,
        borderRadius: '50%',
        background: player.alive
          ? `radial-gradient(circle at 30% 30%, ${colors.secondary}, #0d0d1a 70%)`
          : 'radial-gradient(circle at 30% 30%, #2a2a2a, #0d0d0d 70%)',
        border: `3px solid ${isTargeted ? '#fbbf24' : (player.alive ? colors.primary : '#444')}`,
        boxShadow: player.alive
          ? `0 0 20px ${colors.glow}, inset 0 0 20px rgba(0,0,0,0.5)`
          : 'inset 0 0 20px rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          background: isTargeted
            ? `conic-gradient(from 0deg, #fbbf24, #f59e0b, #fbbf24)`
            : `conic-gradient(from 0deg, ${colors.primary}66, ${colors.primary}22, ${colors.primary}66)`,
          animation: player.alive ? 'rotate 8s linear infinite' : 'none',
          opacity: player.alive ? 1 : 0.3,
        }} />
        {role?.image ? (
          <img
            src={role.image}
            alt={role.name}
            style={{
              width: tokenSize * 0.6,
              height: tokenSize * 0.6,
              objectFit: 'contain',
              filter: player.alive ? 'none' : 'grayscale(1)',
              opacity: player.alive ? 1 : 0.5,
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <span style={{
            fontSize: tokenSize * 0.35,
            filter: player.alive ? 'none' : 'grayscale(1)',
            opacity: player.alive ? 1 : 0.5,
          }}>
            {role?.icon || '❓'}
          </span>
        )}
        <div style={{
          position: 'absolute',
          top: -2,
          right: -2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          pointerEvents: 'none',
        }}>
          {player.executed && <span style={{ fontSize: tokenSize * 0.22, filter: 'drop-shadow(0 0 2px #000)' }}>💀</span>}
          {player.poisoned && <span style={{ fontSize: tokenSize * 0.2, filter: 'drop-shadow(0 0 2px #000)' }}>☠️</span>}
          {player.ivre && <span style={{ fontSize: tokenSize * 0.2, filter: 'drop-shadow(0 0 2px #000)' }}>🍺</span>}
          {player.master && <span style={{ fontSize: tokenSize * 0.2, filter: 'drop-shadow(0 0 2px #000)' }}>👑</span>}
          {player.decoy && <span style={{ fontSize: tokenSize * 0.2, filter: 'drop-shadow(0 0 2px #000)' }}>❓</span>}
          {player.protected && <span style={{ fontSize: tokenSize * 0.2, filter: 'drop-shadow(0 0 2px #000)' }}>🛡️</span>}
          {player.used && <span style={{ fontSize: tokenSize * 0.2, filter: 'drop-shadow(0 0 2px #000)' }}>✓</span>}
        </div>
        {(isSelected || isTargeted) && (
          <div style={{
            position: 'absolute',
            inset: -8,
            borderRadius: '50%',
            border: `2px solid ${isTargeted ? '#fbbf24' : '#c9a55c'}`,
            boxShadow: `0 0 20px ${isTargeted ? 'rgba(251, 191, 36, 0.6)' : 'rgba(201, 165, 92, 0.6)'}`,
            animation: 'pulse 1.5s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Nom du joueur (en dessous du token) */}
      <div style={{
        position: 'absolute',
        top: tokenSize,
        width: '100%',
        fontSize: Math.max(20, tokenSize * 0.15),
        fontWeight: '600',
        color: player.alive ? '#e8e0d5' : '#999',
        textShadow: '0 1px 3px #000, 0 0 8px #000', // Lisible aussi sur le fond clair du jour
        textAlign: 'center',
        maxWidth: tokenSize,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}>
        {player.name}
      </div>

      {/* Ce que le Conteur doit garder en tête : rôle cru par le Soûlard, rôle sous lequel on est vu */}
      {(player.shownRole || player.seenAs) && (
        <div className="token-note" style={{
          position: 'absolute',
          top: tokenSize + 24,
          fontSize: 12,
          color: '#00c9a7',
          textShadow: '0 1px 3px #000, 0 0 8px #000',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {player.shownRole ? `croit être ${getRoleName(player.shownRole)}` : `vu comme ${getRoleName(player.seenAs)}`}
        </div>
      )}
    </div>
  );
}

export default PlayerToken;