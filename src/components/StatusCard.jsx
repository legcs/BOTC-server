import React, { useState, useEffect } from 'react';
import { allRoles, roles } from '../data/roles';
import { getRoleCategory, getCategoryColor } from '../utils/roleUtils';
import { assignRoles } from '../utils/gameLogic';

function StatusCard({
  player,
  players,
  onUpdate,
  onClose,
  onRemove,
  position = { x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 200 }, // Position par défaut
  onDrag,
  style,
  roleAssigned,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const role = allRoles.find(r => r.id === player.role);
  const category = getRoleCategory(player.role);
  const colors = getCategoryColor(category);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [notes, setNotes] = useState(player.notes || '');
  const assignedRoles = players
    .filter(p => p.id !== player.id)
    .map(p => p.role);


  // Gestion des événements tactiles
  const handleTouchStart = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setIsDragging(true);
    e.stopPropagation();
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    onDrag(player.id, {
      x: touch.clientX - dragOffset.x,
      y: touch.clientY - dragOffset.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Gestion des événements de souris (pour desktop)
  const handleMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
    e.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    onDrag(player.id, {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  // Écouteur global pour éviter que la carte reste "collée" à la souris
  useEffect(() => {
    const handleMouseUpGlobal = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
  }, []);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    setNotes(player.notes || '');
  }, [player.notes]);

  const toggleStatus = (status) => {
    onUpdate(player.id, { [status]: !player[status] });
  };

  const updateRole = (roleId) => {
    onUpdate(player.id, { role: roleId });
    setShowRoleSelector(false);
  };

  const saveNotes = () => {
    onUpdate(player.id, { notes });
  };

  return (
    <div
      style={{
        ...style,
        width: '320px',
        background: 'linear-gradient(145deg, rgba(26, 26, 46, 0.98) 0%, rgba(13, 13, 26, 0.99) 100%)',
        border: `2px solid ${colors.primary}66`,
        borderRadius: '16px',
        padding: '1.25rem',
        boxShadow: `0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px ${colors.glow}`,
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none', // Désactive le comportement par défaut des événements tactiles
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: 'none',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          fontSize: '1.2rem',
          padding: '0.25rem',
          lineHeight: 1,
        }}
      >
        ×
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${colors.secondary}, #0d0d1a 70%)`,
          border: `3px solid ${colors.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          boxShadow: `0 0 15px ${colors.glow}`,
          flexShrink: 0,
        }}>
          {role?.image ? (
            <img
              src={role.image}
              alt={role.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
              }}
            />
          ) : (
            <span style={{ fontSize: '1.8rem' }}>{role?.icon || '❓'}</span>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.3rem',
            color: '#e8e0d5',
            fontFamily: '"Cinzel", serif',
          }}>
            {player.name}
          </h3>
          <button
            onClick={() => setShowRoleSelector(!showRoleSelector)}
            style={{
              background: 'none',
              border: 'none',
              color: colors.primary,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            {role?.name || 'Choisir rôle'} <span style={{ fontSize: '0.7rem' }}>▼</span>
          </button>
        </div>
      </div>

      {showRoleSelector && (
        <div style={{
          position: 'absolute',
          top: '7%',
          left: '170px',
          right: '-170px',
          marginTop: '0.5rem',
          background: 'rgba(13, 13, 26, 0.98)',
          border: '1px solid rgba(201, 165, 92, 0.3)',
          borderRadius: '12px',
          padding: '1rem',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1001,
        }}>
          {Object.entries(roles).map(([cat, roleList]) => (
            <div key={cat} style={{ marginBottom: '0.75rem' }}>
              <div style={{
                fontSize: '0.7rem',
                color: getCategoryColor(cat === 'townsfolk' ? 'townsfolk' : cat === 'outsiders' ? 'outsider' : cat === 'minions' ? 'minion' : 'demon').primary,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.4rem',
              }}>
                {cat === 'townsfolk' ? 'Villageois' : cat === 'outsiders' ? 'Étrangers' : cat === 'minions' ? 'Sbires' : 'Démons'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {roleList.map((r) => {
                  const isAssigned = assignedRoles.includes(r.id);

                  return (
                    <button
                      key={r.id}
                      onClick={() => !isAssigned && updateRole(r.id)}
                      disabled={isAssigned}
                      style={{
                        background: player.role === r.id
                          ? 'rgba(201, 165, 92, 0.3)'
                          : isAssigned
                            ? 'rgba(50, 50, 50, 0.3)'
                            : 'rgba(0, 0, 0, 0.3)',
                        border: `1px solid ${player.role === r.id ? 'rgba(201, 165, 92, 0.6)' : 'rgba(100, 100, 100, 0.3)'}`,
                        borderRadius: '6px',
                        padding: '0.3rem 0.5rem',
                        color: isAssigned ? '#555' : '#e8e0d5',
                        cursor: isAssigned ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        opacity: isAssigned ? 0.5 : 1,
                      }}
                    >
                      <span>{r.icon}</span>
                      <span>{r.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{
        margin: '0 0 1rem 0',
        fontSize: '0.85rem',
        color: '#8b7355',
        fontStyle: 'italic',
        lineHeight: 1.4,
      }}>
        {role?.description}
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
        marginBottom: '1rem',
      }}>
        <button
          onClick={() => toggleStatus('alive')}
          style={{
            background: player.alive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 107, 107, 0.2)',
            border: `1px solid ${player.alive ? 'rgba(74, 222, 128, 0.5)' : 'rgba(255, 107, 107, 0.5)'}`,
            borderRadius: '8px',
            padding: '0.6rem',
            color: player.alive ? '#4ade80' : '#ff6b6b',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          {player.alive ? 'Vivant' : 'Mort'}
        </button>

        <button
          onClick={() => toggleStatus('executed')}
          style={{
            background: player.executed ? 'rgba(255, 107, 107, 0.2)' : 'rgba(60, 60, 60, 0.2)',
            border: `1px solid ${player.executed ? 'rgba(255, 107, 107, 0.5)' : 'rgba(60, 60, 60, 0.4)'}`,
            borderRadius: '8px',
            padding: '0.6rem',
            color: player.executed ? '#ff6b6b' : '#888',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          💀 Executé
        </button>

        <button
          onClick={() => toggleStatus('decoy')}
          style={{
            background: player.decoy ? 'rgba(251, 191, 36, 0.3)' : 'rgba(60, 60, 60, 0.2)',
            border: `1px solid ${player.decoy ? 'rgba(251, 191, 36, 0.6)' : 'rgba(60, 60, 60, 0.4)'}`,
            borderRadius: '8px',
            padding: '0.6rem',
            color: player.decoy ? '#fbbf24' : '#888',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          ❓ Leurre
        </button>

        <button
          onClick={() => toggleStatus('master')}
          style={{
            background: player.master ? '#4c4c4cff' : 'rgba(60, 60, 60, 0.2)',
            border: `1px solid ${player.master ? '#f3f1f6ff' : 'rgba(60, 60, 60, 0.4)'}`,
            borderRadius: '8px',
            padding: '0.6rem',
            color: player.master ? '#f3f1f6ff' : '#888',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          👑 Maître
        </button>

        <button
          onClick={() => toggleStatus('ivre')}
          style={{
            background: player.ivre ? '#41225dff' : 'rgba(60, 60, 60, 0.2)',
            border: `1px solid ${player.ivre ? '#a855f7' : 'rgba(60, 60, 60, 0.4)'}`,
            borderRadius: '8px',
            padding: '0.6rem',
            color: player.ivre ? '#a855f7' : '#888',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          🍺 Ivre
        </button>

        <button
          onClick={() => toggleStatus('poisoned')}
          style={{
            background: player.poisoned ? '#215410ff' : 'rgba(60, 60, 60, 0.2)',
            border: `1px solid ${player.poisoned ? '#59df2cff' : 'rgba(60, 60, 60, 0.4)'}`,
            borderRadius: '8px',
            padding: '0.6rem',
            color: player.poisoned ? '#59df2cff' : '#888',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          ☠️ Empoisonné
        </button>

        <button
          onClick={() => toggleStatus('protected')}
          style={{
            background: player.protected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(60, 60, 60, 0.2)',
            border: `1px solid ${player.protected ? 'rgba(59, 130, 246, 0.6)' : 'rgba(60, 60, 60, 0.4)'}`,
            borderRadius: '8px',
            padding: '0.6rem',
            color: player.protected ? '#3b82f6' : '#888',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
        >
          🛡️ Protégé
        </button>
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '0.75rem',
          color: '#8b7355',
          marginBottom: '0.4rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          Notes du Conteur
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Informations, rappels..."
          style={{
            width: '100%',
            height: '60px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(139, 69, 69, 0.3)',
            borderRadius: '8px',
            padding: '0.5rem',
            color: '#e8e0d5',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            resize: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {!roleAssigned && (
        <button
          onClick={() => onRemove(player.id)}
          style={{
            width: '100%',
            marginTop: '1rem',
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '8px',
            padding: '0.5rem',
            color: '#ff6b6b',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.8rem',
            transition: 'all 0.2s ease',
          }}
        >
          🗑️ Retirer du cercle
        </button>
      )}
    </div>
  );
}

export default StatusCard;