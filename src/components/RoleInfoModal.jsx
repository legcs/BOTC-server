import React from 'react';
import { allRoles } from '../data/roles';
import { getCategoryColor, getRoleCategory } from '../utils/roleUtils';

const CATEGORY = { townsfolk: 'Villageois', outsider: 'Étranger', minion: 'Sbire', demon: 'Démon' };

// Rappel d'un rôle : ce qu'il fait, et comment il fonctionne en détail
function RoleInfoModal({ roleId, onClose }) {
  const role = allRoles.find((r) => r.id === roleId);
  if (!role) return null;
  const category = getRoleCategory(role.id);
  const colors = getCategoryColor(category);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: '1rem',
      }}
    >
      <div
        className="role-info"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(26, 26, 46, 0.98)', border: `2px solid ${colors.primary}`, borderRadius: '16px',
          padding: '1.25rem 1.5rem', maxWidth: '440px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#e8e0d5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {role.image
            ? <img src={role.image} alt="" style={{ width: 56, height: 56 }} />
            : <span style={{ fontSize: '2.2rem' }}>{role.icon}</span>}
          <div>
            <div className="role-info-name" style={{ fontSize: '1.4rem', fontWeight: 600, color: colors.primary }}>{role.name}</div>
            <div style={{ fontSize: '0.85rem', color: '#b8a88a' }}>
              {CATEGORY[category]} · camp du {category === 'minion' || category === 'demon' ? 'Mal' : 'Village'}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: '"Cinzel", serif', fontSize: '0.8rem', color: '#c9a55c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Capacité</div>
          <p className="role-info-ability" style={{ margin: '0.3rem 0 0', lineHeight: 1.45 }}>{role.description}</p>
        </div>

        {role.detailedDescription && (
          <div>
            <div style={{ fontFamily: '"Cinzel", serif', fontSize: '0.8rem', color: '#c9a55c', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Fonctionnement</div>
            <p className="role-info-details" style={{ margin: '0.3rem 0 0', lineHeight: 1.45, color: '#d8d0c5' }}>{role.detailedDescription}</p>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            alignSelf: 'center', background: 'transparent', border: `1px solid ${colors.primary}`, borderRadius: '8px',
            padding: '0.45rem 1.4rem', color: colors.primary, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem',
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export default RoleInfoModal;
