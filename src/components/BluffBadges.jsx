import React from 'react';
import { allRoles } from '../data/roles';

// Vignettes des bluffs transmis par le Démon à un Sbire, affichées à côté de son jeton
function BluffBadges({ bluffs, tokenSize }) {
  if (!bluffs || bluffs.length === 0) return null;
  const size = Math.max(26, tokenSize * 0.4);

  return (
    <div
      className="bluff-badges"
      style={{
        position: 'absolute', top: 0, right: '100%', marginRight: 4, display: 'flex', flexDirection: 'column',
        gap: 3, pointerEvents: 'none', zIndex: 3,
      }}
    >
      {bluffs.map((id) => {
        const role = allRoles.find((r) => r.id === id);
        return (
          <div
            key={id}
            className="bluff-badge"
            data-role={id}
            title={`Bluff transmis par le Démon : ${role?.name}`}
            style={{
              width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(circle at 30% 30%, #3d1f5c, #0d0d1a 75%)', border: '2px dashed #b794f4',
              boxShadow: '0 0 8px rgba(157, 78, 221, 0.6)',
            }}
          >
            {role?.image
              ? <img src={role.image} alt={role.name} style={{ width: size * 0.7, height: size * 0.7, objectFit: 'contain' }} />
              : <span style={{ fontSize: size * 0.5 }}>{role?.icon}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default BluffBadges;
