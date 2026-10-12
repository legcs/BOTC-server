import React from 'react';
import { allRoles } from '../data/roles';
import { getRoleCategory, getCategoryColor, getActionType } from '../utils/roleUtils';
import DayVotePanel from './DayVotePanel';

function NightOrderPanel({
  currentTime,
  currentNight,
  nightOrder,
  completedActions,
  players,
  onStartAction,
  onExecutePlayer,
  onSkipExecution,
  onStartNewDay,
  addNightEvent,
  onAutoAction,
  killedTonightId,
  roleAssigned,
  onAssignRoles,
  setIsStarted,
  multiplayer = false,
  dayVote = null,
  debate = null,
}) {
  const currentOrder = currentTime === 'JOUR'
    ? nightOrder.day
    : (currentNight === 1 ? nightOrder.first : nightOrder.other);

  const activeRoles = players.filter(p => p.alive).map(p => p.role);

  const isStepActive = (step) => {
    if (step.role === null) return true;
    // Le Gardien ne se réveille que la nuit où il est tué
    if (step.role === 'ravenkeeper') {
      return players.some(p => p.role === 'ravenkeeper' && p.id === killedTonightId);
    }
    return activeRoles.includes(step.role);
  };

  const renderDayActions = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minHeight: 0 }}>
      {dayVote && <DayVotePanel dayVote={dayVote} players={players} onExecutePlayer={onExecutePlayer} />}
      {/* Actions du jour (défilantes, pour garder l'exécution toujours visible) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {currentOrder.map((step, index) => {
        const role = step.role ? allRoles.find(r => r.id === step.role) : null;
        const category = step.role ? getRoleCategory(step.role) : null;
        const colors = category ? getCategoryColor(category) : null;
        const isActive = isStepActive(step);
        const actionKey = `${step.role || 'special'}-${index}`;
        const isCompleted = completedActions.includes(actionKey);
        const actionType = step.type ?? (step.role ? getActionType(step.role) : 'none');

        return (
          <div
            key={index}
            className="night-step"
            onClick={() => {
              if (isActive && !isCompleted) {
                if (actionType === 'auto') {
                  // Actions automatiques
                  onAutoAction(step.role, step.action, actionKey);
                } else if (actionType !== 'none') {
                  // Actions nécessitant une sélection
                  onStartAction(step.role, step.action, actionKey);
                } else {
                  // Événements spéciaux
                  addNightEvent(`${step.action}`, actionKey);
                }
              }
            }}
            style={{
              background: isCompleted
                ? 'rgba(139, 69, 69, 0.3)'
                : isActive
                  ? 'rgba(139, 69, 69, 0.1)'
                  : 'rgba(50, 50, 50, 0.1)',
              border: `1px solid ${isCompleted
                ? 'rgba(139, 69, 69, 0.5)'
                : isActive
                  ? 'rgba(139, 69, 69, 0.25)'
                  : 'rgba(50, 50, 50, 0.2)'
                }`,
              borderRadius: '8px',
              padding: '0.6rem 0.75rem',
              cursor: isActive && !isCompleted ? 'pointer' : 'default',
              opacity: isActive ? 1 : 0.4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem'
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: '600',
                color: isActive
                  ? (isCompleted ? '#666' : (colors ? colors.primary : '#c9a55c'))
                  : '#555',
                marginBottom: '0.15rem',
              }}>
                {role ? `${role.icon} ${role.name}` : '⭐ Spécial'}
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: isActive ? (isCompleted ? '#666' : '#8b7355') : '#555',
                lineHeight: 1.3,
              }}>
                {step.action}
              </div>
            </div>
          </div>
        );
      })}
      </div>

      <button
        onClick={onSkipExecution}
        style={{
          padding: '0.5rem 0.8rem',
          borderRadius: '8px',
          border: '1px solid rgba(201, 165, 92, 0.4)',
          background: 'linear-gradient(135deg, #2d1f3d 0%, #1a1a2e 100%)',
          color: '#c9a55c',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '1rem',
        }}
      >
        ⏭️ Pas d'exécution
      </button>

      {/* Section exécution */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: '0.5rem',
        maxWidth: '100%',
      }}>
        <span style={{
          gridColumn: '1 / -1',
          textAlign: 'center', // Centre le texte horizontalement
          fontWeight: '600',   // Optionnel : rend le texte un peu plus gras
          fontSize: '1rem',  // Optionnel : ajuste la taille du texte
        }}>
          Joueur à exécuter :
        </span>
        {players.filter(p => p.alive).map(p => (
          <button
            key={p.id}
            onClick={() => onExecutePlayer(p.id)}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '4px',
              border: '1px solid #b13e3eff',
              background: '#522323ff',
              color: '#fff',
              cursor: 'pointer',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'background 0.2s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#444'}
            onMouseOut={(e) => e.currentTarget.style.background = '#522323ff'}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );

  const renderNightActions = () => (
    <div
    className='actions'
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.4rem', 
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        marginBottom: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {currentOrder.map((step, index) => {
          const role = step.role ? allRoles.find(r => r.id === step.role) : null;
          const category = step.role ? getRoleCategory(step.role) : null;
          const colors = category ? getCategoryColor(category) : null;
          const isActive = isStepActive(step);
          const actionKey = `${step.role || 'special'}-${index}`;
          const isCompleted = completedActions.includes(actionKey);
          const actionType = step.type ?? (step.role ? getActionType(step.role) : 'none');

          return (
            <div
              key={index}
              className="night-step"
              onClick={() => {
                setIsStarted(true);
                if (isActive && !isCompleted) {
                  if (actionType === 'auto') {
                    // Actions automatiques
                    onAutoAction(step.role, step.action, actionKey);
                  } else if (actionType !== 'none') {
                    // Actions nécessitant une sélection
                    onStartAction(step.role, step.action, actionKey);
                  } else {
                    // Événements spéciaux
                    addNightEvent(`${step.action}`, actionKey);
                  }
                }
              }}
              style={{
                background: isCompleted
                  ? 'rgba(139, 69, 69, 0.3)'
                  : isActive
                    ? 'rgba(139, 69, 69, 0.1)'
                    : 'rgba(50, 50, 50, 0.1)',
                border: `1px solid ${isCompleted
                  ? 'rgba(139, 69, 69, 0.5)'
                  : isActive
                    ? 'rgba(139, 69, 69, 0.25)'
                    : 'rgba(50, 50, 50, 0.2)'
                  }`,
                borderRadius: '8px',
                padding: '0.6rem 0.75rem',
                cursor: isActive && !isCompleted ? 'pointer' : 'default',
                opacity: isActive ? 1 : 0.4,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                width:'315px'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: isActive
                    ? (isCompleted ? '#666' : (colors ? colors.primary : '#c9a55c'))
                    : '#555',
                  marginBottom: '0.15rem',
                }}>
                  {role ? `${role.icon} ${role.name}` : '⭐ Spécial'}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: isActive ? (isCompleted ? '#666' : '#8b7355') : '#555',
                  lineHeight: 1.3,
                }}>
                  {step.action}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{
      flex: 1,
      padding: '1rem',
      overflowY: 'auto',
      borderBottom: '1px solid rgba(139, 69, 69, 0.2)',
      display: 'flex',          // Active le mode flex
      flexDirection: 'column', // Disposition en colonne
      minHeight: 0,             // Permet au conteneur de s'étendre
    }}>      <h2 style={{
        margin: '0 0 1rem 0',
        fontSize: '1.2rem',
        fontFamily: '"Cinzel", serif',
        color: '#c9a55c',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        <span>{currentTime === 'JOUR' ? '☀️' : '🌙'}</span>
        {currentTime === 'JOUR' ? 'Actions du Jour' : `Actions de la nuit`}
      </h2>

      {players.length >= 5 && roleAssigned ? (
        currentTime === 'JOUR' ? renderDayActions() : renderNightActions()
      ) : (
        <p 
          style={{
            display: 'flex',
            justifyContent: 'center'
          }}
        >{multiplayer
          ? 'Attendez qu\'au moins 5 joueurs aient rejoint le salon, puis assignez les rôles.'
          : 'Veuillez ajouter au moins 5 joueurs et assigner les rôles.'}</p>
      )}

        {debate && (
          <label
            className="debate-setting"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
              marginTop: 'auto', marginBottom: '0.5rem', color: '#b8a88a', fontSize: '0.9rem',
            }}
          >
            Durée du débat (minutes)
            <input
              type="number"
              min="0"
              max="60"
              value={debate.minutes}
              onChange={(e) => debate.onChange(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
              style={{
                width: '4.5rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(139, 69, 69, 0.4)',
                borderRadius: '6px', padding: '0.3rem 0.5rem', color: '#e8e0d5', fontFamily: 'inherit', fontSize: '0.95rem',
              }}
            />
          </label>
        )}

        {(players.length >= 5 && !roleAssigned && currentTime === 'NUIT') && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            justifyContent: 'center',
            marginTop: debate ? 0 : 'auto', // ← Pousse le bouton vers le bas
          }}>
          {/* Bouton Assigner */}
          <button
            onClick={onAssignRoles}
            style={{
              background: 'linear-gradient(135deg, #2d1f3d 0%, #1a1a2e 100%)',
              border: '1px solid rgba(157, 78, 221, 0.4)',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              color: '#b794f4',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              justifyContent: 'center'
            }}
          >
            Assigner les rôles
          </button>        </div>
      )}

      {(players.length >= 5 && roleAssigned && currentTime === 'NUIT') && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          justifyContent: 'center',
          marginTop: debate ? 0 : 'auto', // ← Pousse le bouton vers le bas
        }}>
          <button
            onClick={onStartNewDay}
            style={{
              background: 'linear-gradient(135deg, #2d1f3d 0%, #1a1a2e 100%)',
              border: '1px solid #ebf056ff',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              color: '#ebf056ff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              justifyContent: 'center'
            }}
          >
            ☀️ Nouvelle Journée
          </button>
        </div>
      )}


    </div>
  );
}

export default NightOrderPanel;
