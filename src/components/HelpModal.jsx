import React, { useState } from 'react';
import { roles } from '../data/roles';
import { nightOrder } from '../data/nightOrder';
import { victoryConditions } from '../data/victoryConditions';

function HelpModal({ onClose }) {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sections = [
    {
      id: 'overview',
      title: 'Vue d\'ensemble',
      icon: '📖',
      content: (
        <div>
          <p><strong>Blood on the Clocktower</strong> est un jeu de rôles sociaux où les joueurs sont divisés en deux camps :</p>
          <ul>
            <li><strong style={{ color: '#4a9eff' }}>Le Village</strong> (Villageois + Étrangers) : Doit identifier et exécuter le Démon</li>
            <li><strong style={{ color: '#ff6b6b' }}>Le Mal</strong> (Sbires + Démon) : Doit survivre jusqu'à ce qu'il ne reste que 2 joueurs</li>
          </ul>
          <p><strong>Déroulement :</strong></p>
          <ol>
            <li>🌙 <strong>Phase de Nuit</strong> : Les rôles utilisent leurs capacités dans un ordre précis</li>
            <li>☀️ <strong>Phase de Jour</strong> : Discussion, nominations et vote pour exécuter un joueur</li>
          </ol>
        </div>
      )
    },
    {
      id: 'roles',
      title: 'Les Rôles',
      icon: '🎭',
      content: (
        <div>
          {/* Villageois */}
          <h4 style={{ color: '#4a9eff', marginTop: 0 }}>
            Villageois
          </h4>
          <ul style={{ fontSize: '0.85rem', lineHeight: 1.3, marginLeft: '1.5rem' }}>
            {roles.townsfolk.map((role) => (
              <li key={role.id}>
                <strong>{role.name}</strong> : {role.description}
                {role.detailedDescription && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#8b7355', 
                    fontStyle: 'italic', 
                    marginBottom: '0.5rem',
                    paddingLeft: '1rem' ,
                  }}>
                    {role.detailedDescription}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Étrangers */}
          <h4 style={{ color: '#00c9a7', marginTop: '1rem' }}>
            {roles.outsiders[0]?.icon} Étrangers
          </h4>
          <ul style={{ fontSize: '0.85rem', lineHeight: 1.3, marginLeft: '1.5rem' }}>
            {roles.outsiders.map((role) => (
              <li key={role.id}>
                <strong>{role.name}</strong> : {role.description}
                {role.detailedDescription && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#8b7355', 
                    fontStyle: 'italic', 
                    marginBottom: '0.5rem',
                    paddingLeft: '1rem' ,
                  }}>
                    {role.detailedDescription}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Sbires */}
          <h4 style={{ color: '#ff6b6b', marginTop: '1rem' }}>
            {roles.minions[0]?.icon} Sbires
          </h4>
          <ul style={{ fontSize: '0.85rem', lineHeight: 1.3, marginLeft: '1.5rem' }}>
            {roles.minions.map((role) => (
              <li key={role.id}>
                <strong>{role.name}</strong> : {role.description}
                {role.detailedDescription && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#8b7355', 
                    fontStyle: 'italic', 
                    marginBottom: '0.5rem',
                    paddingLeft: '1rem' ,
                  }}>
                    {role.detailedDescription}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Démons */}
          <h4 style={{ color: '#9d4edd', marginTop: '1rem' }}>
            {roles.demons[0]?.icon} Démons
          </h4>
          <ul style={{ fontSize: '0.85rem', lineHeight: 1.3, marginLeft: '1.5rem' }}>
            {roles.demons.map((role) => (
              <li key={role.id}>
                <strong>{role.name}</strong> : {role.description}
                {role.detailedDescription && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#8b7355', 
                    fontStyle: 'italic', 
                    marginBottom: '0.5rem',
                  }}>
                    {role.detailedDescription}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <p style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(201, 165, 92, 0.1)', borderRadius: '8px', border: '1px solid rgba(201, 165, 92, 0.3)' }}>
            <strong>Note :</strong> Les descriptions détaillées incluent les subtilités et cas particuliers de chaque rôle.
          </p>
        </div>
      )
    },
    {
      id: 'night',
      title: 'Phase de Nuit',
      icon: '🌙',
      content: (
        <div>
          <h4 style={{ marginTop: 0 }}>Première Nuit (ordre spécial) :</h4>
          <ol style={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
            {nightOrder.first.map((step, index) => (
              <li key={index}>
                {step.action}
              </li>
            ))}
          </ol>

          <h4 style={{ marginTop: '1rem' }}>Autres Nuits :</h4>
          <ol style={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
            {nightOrder.other.map((step, index) => (
              <li key={index}>
                {step.action}
              </li>
            ))}
          </ol>

          <p style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <strong>💡 Astuce :</strong> Cliquez sur une action dans la liste pour activer le mode sélection !
          </p>
        </div>
      )
    },
    {
      id: 'day',
      title: 'Phase de Jour',
      icon: '☀️',
      content: (
        <div>
          <h4 style={{ marginTop: 0 }}>Déroulement du Jour :</h4>
          <ol style={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
            {nightOrder.day.map((step, index) => (
              <li key={index}>
                <strong>{step.action}</strong>
              </li>
            ))}
          </ol>

          <h4 style={{ marginTop: '1rem' }}>Règles de Vote :</h4>
          <ul style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
            <li>Chaque joueur vivant peut nominer une fois par jour</li>
            <li>Un joueur peut se nominer lui-même</li>
            <li>Les joueurs morts peuvent voter une fois dans toute la partie</li>
            <li>Le Majordome ne peut voter que si son Maître vote</li>
          </ul>

          <p style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 107, 107, 0.3)' }}>
            <strong>⚠️ Attention :</strong> Si le Saint est exécuté, le Mal gagne immédiatement !
          </p>
        </div>
      )
    },
    {
      id: 'poison',
      title: 'Empoisonnement',
      icon: '☠️',
      content: (
        <div>
          <h4 style={{ marginTop: 0 }}>Comment fonctionne l'empoisonnement ?</h4>
          <p>{victoryConditions.special.poisoner.description}</p>

          <h4 style={{ marginTop: '1rem' }}>Effets :</h4>
          <ul style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
            {victoryConditions.special.poisoner.details.map((detail, idx) => (
              <li key={idx}>{detail}</li>
            ))}
          </ul>

          <h4 style={{ marginTop: '1rem' }}>Exemples :</h4>
          <ul style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
            {victoryConditions.special.poisoner.examples.map((example, idx) => (
              <li key={idx}>{example}</li>
            ))}
          </ul>

          <p style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(157, 78, 221, 0.1)', borderRadius: '8px', border: '1px solid rgba(157, 78, 221, 0.3)' }}>
            <strong>💡 :</strong> {victoryConditions.special.drunk.description}
          </p>
        </div>
      )
    },
    {
      id: 'victory',
      title: 'Conditions de Victoire',
      icon: '🏆',
      content: (
        <div>
          {/* Victoire du Village */}
          <h4 style={{ color: '#4ade80', marginTop: 0 }}>🏛️ Victoire du Village</h4>
          
          {/* Standard */}
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(74, 222, 128, 0.05)', borderLeft: '3px solid #4ade80', borderRadius: '0 8px 8px 0' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#4ade80' }}>{victoryConditions.good.standard.title}</h5>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}><strong>Condition :</strong> {victoryConditions.good.standard.condition}</p>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>{victoryConditions.good.standard.description}</p>
            <details style={{ fontSize: '0.8rem', color: '#8b7355', marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Détails</summary>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {victoryConditions.good.standard.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </details>
          </div>

          {/* Maire */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(74, 222, 128, 0.05)', borderLeft: '3px solid #4ade80', borderRadius: '0 8px 8px 0' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#4ade80' }}>{victoryConditions.good.mayor.title}</h5>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}><strong>Condition :</strong> {victoryConditions.good.mayor.condition}</p>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>{victoryConditions.good.mayor.description}</p>
            <details style={{ fontSize: '0.8rem', color: '#8b7355', marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Détails</summary>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {victoryConditions.good.mayor.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </details>
          </div>

          {/* Victoire du Mal */}
          <h4 style={{ color: '#ff6b6b', marginTop: '1.5rem' }}>👺 Victoire du Mal</h4>

          {/* Standard */}
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255, 107, 107, 0.05)', borderLeft: '3px solid #ff6b6b', borderRadius: '0 8px 8px 0' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#ff6b6b' }}>{victoryConditions.evil.standard.title}</h5>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}><strong>Condition :</strong> {victoryConditions.evil.standard.condition}</p>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>{victoryConditions.evil.standard.description}</p>
            <details style={{ fontSize: '0.8rem', color: '#8b7355', marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Détails</summary>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {victoryConditions.evil.standard.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </details>
          </div>

          {/* Saint */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255, 107, 107, 0.05)', borderLeft: '3px solid #ff6b6b', borderRadius: '0 8px 8px 0' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#ff6b6b' }}>{victoryConditions.evil.saint.title}</h5>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}><strong>Condition :</strong> {victoryConditions.evil.saint.condition}</p>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>{victoryConditions.evil.saint.description}</p>
            <details style={{ fontSize: '0.8rem', color: '#8b7355', marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Détails</summary>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {victoryConditions.evil.saint.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </details>
          </div>

          {/* Conditions Spéciales */}
          <h4 style={{ color: '#9d4edd', marginTop: '1.5rem' }}>⚡ Conditions Spéciales</h4>

          {/* Confidente */}
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(157, 78, 221, 0.05)', borderLeft: '3px solid #9d4edd', borderRadius: '0 8px 8px 0' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#9d4edd' }}>🎭 {victoryConditions.special.scarletWoman.title}</h5>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}><strong>Condition :</strong> {victoryConditions.special.scarletWoman.condition}</p>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>{victoryConditions.special.scarletWoman.description}</p>
            <details style={{ fontSize: '0.8rem', color: '#8b7355', marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Détails</summary>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {victoryConditions.special.scarletWoman.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </details>
          </div>

          {/* Suicide Imp */}
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(157, 78, 221, 0.05)', borderLeft: '3px solid #9d4edd', borderRadius: '0 8px 8px 0' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', color: '#9d4edd' }}>💀 {victoryConditions.special.impSuicide.title}</h5>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}><strong>Condition :</strong> {victoryConditions.special.impSuicide.condition}</p>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>{victoryConditions.special.impSuicide.description}</p>
            <details style={{ fontSize: '0.8rem', color: '#8b7355', marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>Détails</summary>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {victoryConditions.special.impSuicide.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </details>
          </div>

          {/* Résumé */}
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(201, 165, 92, 0.1)', borderRadius: '8px', border: '1px solid rgba(201, 165, 92, 0.3)' }}>
            <h5 style={{ margin: '0 0 0.75rem 0', color: '#c9a55c' }}>📋 Résumé Rapide</h5>
            <div style={{ marginBottom: '0.75rem' }}>
              <strong style={{ color: '#4ade80' }}>Village :</strong>
              <ul style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 1.5rem', paddingLeft: 0 }}>
                {victoryConditions.summary.good.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <strong style={{ color: '#ff6b6b' }}>Mal :</strong>
              <ul style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 1.5rem', paddingLeft: 0 }}>
                {victoryConditions.summary.evil.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
            <div>
              <strong style={{ color: '#9d4edd' }}>Exceptions :</strong>
              <ul style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 1.5rem', paddingLeft: 0 }}>
                {victoryConditions.summary.exceptions.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'interface',
      title: 'Utilisation de l\'Interface',
      icon: '⚙️',
      content: (
        <div>
          <h4 style={{ marginTop: 0 }}>Configuration :</h4>
          <ol style={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
            <li>Ajoutez les joueurs avec <strong>"+ Ajouter un joueur"</strong></li>
            <li>Cliquez sur <strong>"Assigner les rôles"</strong> (5-15 joueurs)</li>
          </ol>

          <h4 style={{ marginTop: '1rem' }}>Gestion des Tokens :</h4>
          <ul style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
            <li><strong>Cliquer</strong> pour voir/modifier le statut</li>
            <li><strong>Glisser-déposer</strong> pour réorganiser</li>
          </ul>

          <h4 style={{ marginTop: '1rem' }}>Statuts :</h4>
          <ul style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
            <li><strong>☠️ Empoisonné</strong> : Capacité dysfonctionnelle</li>
            <li><strong>🛡️ Protégé</strong> : Protégé du Démon cette nuit</li>
            <li><strong>👑 Maître</strong> : Maître du Majordome</li>
            <li><strong>🍺 Ivre</strong> : Marque le Soûlard</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'linear-gradient(145deg, rgba(26, 26, 46, 0.98) 0%, rgba(13, 13, 26, 0.99) 100%)', border: '2px solid rgba(201, 165, 92, 0.4)', borderRadius: '20px', padding: '2rem', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' }} onClick={(e) => e.stopPropagation()}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(201, 165, 92, 0.3)' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontFamily: '"Cinzel", serif', color: '#c9a55c' }}>📚 Guide du Conteur</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '2rem', padding: '0', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sections.map((section) => (
            <div key={section.id} style={{ background: 'rgba(139, 69, 69, 0.1)', border: '1px solid rgba(139, 69, 69, 0.25)', borderRadius: '12px', overflow: 'hidden' }}>
              <button onClick={() => toggleSection(section.id)} style={{ width: '100%', background: expandedSection === section.id ? 'rgba(201, 165, 92, 0.15)' : 'transparent', border: 'none', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{section.icon}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#e8e0d5', fontFamily: '"Cinzel", serif' }}>{section.title}</span>
                </div>
                <span style={{ fontSize: '1.2rem', color: '#8b7355', transform: expandedSection === section.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>▼</span>
              </button>
              {expandedSection === section.id && (
                <div style={{ padding: '1rem 1.25rem 1.5rem', color: '#b8a88a', fontSize: '0.95rem', lineHeight: 1.6, borderTop: '1px solid rgba(139, 69, 69, 0.2)', animation: 'slideDown 0.3s ease' }}>
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid rgba(201, 165, 92, 0.3)' }}>
          <button onClick={onClose} style={{ width: '100%', background: 'linear-gradient(135deg, rgba(201, 165, 92, 0.25) 0%, rgba(201, 165, 92, 0.15) 100%)', border: '2px solid rgba(201, 165, 92, 0.5)', borderRadius: '12px', padding: '1rem', color: '#c9a55c', cursor: 'pointer', fontFamily: '"Cinzel", serif', fontSize: '1.05rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.3s ease' }}>
            ✕ Fermer le Guide
          </button>
        </div>
      </div>

      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default HelpModal;