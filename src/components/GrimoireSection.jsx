
import React, { useState, useRef, useEffect } from 'react';
import PlayerToken from './PlayerToken';
import StatusCard from './StatusCard';

function GrimoireSection({
    containerRef,
    players,
    playerPositions,
    containerSize,
    selectedPlayerId,
    activeAction,
    selectedTargets,
    currentTime,
    currentNight,
    showAddPlayer,
    newPlayerName,
    draggingPlayerId,
    touchOffset,
    onDrop,
    onDragOver,
    onSelectPlayer,
    onSelectTarget,
    onUpdatePlayer,
    onRemovePlayer,
    onAddPlayer,
    onShowAddPlayer,
    onSetNewPlayerName,
    setDraggingPlayerId,
    setTouchOffset,
    setPlayerPositions,
    addPlayer,
    handleTokenClickDuringAction,
    setSelectedPlayerId,
    roleAssigned,
}) {
    const selectedPlayer = players.find(p => p.id === selectedPlayerId);
    const [cardPosition, setCardPosition] = useState({});


    const handleDrag = (playerId, newPosition) => {
        setCardPosition({
            position: newPosition,
        }); 
    };

    // Initialise cardPositions pour chaque joueur lors de la sélection
    useEffect(() => {
    if (selectedPlayer && !cardPosition.position) {
        setCardPosition({
            position: {
                x: window.innerWidth / 2 - 160,
                y: window.innerHeight / 2 - 200,
            },
        });
    }
    }, [selectedPlayer, cardPosition]);




    return (
        <section
            className="grimoire-section"
            ref={containerRef}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onContextMenu={(e) => e.preventDefault()}
            style={{
                flex: 1,
                position: 'relative',
                minHeight: '500px',
                overflow: 'hidden',
            }}
            onClick={() => onSelectPlayer(null)}
        >
            {/* Backgrounds jour/nuit */}
            <div
                className="background day-background"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: 'url(/images/day.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: currentTime === 'JOUR' ? 1 : 0,
                    transition: 'opacity 2s ease',
                    boxShadow: 'inset 0 0 100px rgba(255, 223, 153, 0.2)',
                }}
            />
            <div
                className="background night-background"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundImage: 'url(/images/night.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: currentTime === 'NUIT' ? 1 : 0,
                    transition: 'opacity 2s ease',
                    boxShadow: 'inset 0 0 100px rgba(74, 158, 255, 0.1)',
                }}
            />

            {/* Cercle central */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: Math.min(containerSize.width, containerSize.height) * 0.35,
                height: Math.min(containerSize.width, containerSize.height) * 0.35,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 69, 69, 0.1) 0%, transparent 20%)',
                border: '1px solid rgba(139, 69, 69, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 999,
            }}>
                <span style={{ fontSize: '3rem' }}>⚰️</span>
                <span style={{
                    fontFamily: '"Cinzel", serif',
                    color: 'rgba(255, 255, 255, 1)',
                    fontSize: '0.8rem',
                    letterSpacing: '0.2em',
                    marginTop: '0.5rem',
                }}>
                    {players.filter(p => p.alive).length} / {players.length}
                </span>
            </div>

            {/* Tokens des joueurs */}
            {players.map((player, index) => {
                let isTargetable = false;

                if (activeAction) {
                    const { role, type } = activeAction;

                    // Déterminer si ce joueur est sélectionnable
                    if (type === 'select_one_not_self') {
                        const activePlayer = players.find(p => p.role === role && p.alive);
                        isTargetable = player.alive && player.id !== activePlayer?.id;
                    } else if (type.includes('select')) {
                        isTargetable = player.alive;
                    }
                }


                return (
                    <PlayerToken
                        key={player.id}
                        player={player}
                        index={index}
                        totalPlayers={players.length}
                        onSelect={activeAction ? handleTokenClickDuringAction : (id) => setSelectedPlayerId(id === selectedPlayerId ? null : id)}
                        isSelected={player.id === selectedPlayerId && !activeAction}
                        isTargeted={selectedTargets.includes(player.id)}
                        isTargetable={isTargetable}
                        activeAction={activeAction}
                        position={playerPositions[player.id] || { x: 0, y: 0 }}
                        containerSize={containerSize}
                        draggingPlayerId={draggingPlayerId}
                        setDraggingPlayerId={setDraggingPlayerId}
                        touchOffset={touchOffset}
                        setTouchOffset={setTouchOffset}
                        setPlayerPositions={setPlayerPositions}
                    />
                );
            })}

            {/* Bouton ajouter joueur */}
            {(players.length < 15 && currentTime === 'NUIT' && currentNight === 1) && (
                <button
                    onClick={() => onShowAddPlayer(true)}
                    style={{
                        position: 'absolute',
                        bottom: '1rem',
                        left: '1rem',
                        background: 'rgba(74, 158, 255, 0.2)',
                        border: '1px solid rgba(74, 158, 255, 0.4)',
                        borderRadius: '30px',
                        padding: '0.6rem 1.2rem',
                        color: '#4a9eff',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        zIndex: 50,
                    }}

                >
                    + Ajouter un joueur
                </button>
            )}

            {/* Modal ajout joueur */}
            {showAddPlayer && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '4rem',
                        left: '1rem',
                        background: 'rgba(26, 26, 46, 0.98)',
                        border: '1px solid rgba(201, 165, 92, 0.3)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        gap: '0.5rem',
                        zIndex: 100,
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => onSetNewPlayerName(e.target.value)}
                        placeholder="Nom du joueur..."
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                        style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(139, 69, 69, 0.3)',
                            borderRadius: '8px',
                            padding: '0.6rem 1rem',
                            color: '#e8e0d5',
                            fontFamily: 'inherit',
                            fontSize: '0.95rem',
                            width: '200px',
                        }}
                    />
                    <button
                        onClick={addPlayer}
                        style={{
                            background: 'rgba(74, 222, 128, 0.2)',
                            border: '1px solid rgba(74, 222, 128, 0.5)',
                            borderRadius: '8px',
                            padding: '0.6rem 1rem',
                            color: '#4ade80',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        ✓
                    </button>
                    <button
                        onClick={() => { onShowAddPlayer(false); onSetNewPlayerName(''); }}
                        style={{
                            background: 'rgba(255, 107, 107, 0.2)',
                            border: '1px solid rgba(255, 107, 107, 0.4)',
                            borderRadius: '8px',
                            padding: '0.6rem 1rem',
                            color: '#ff6b6b',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* StatusCard */}
            {selectedPlayer && (
                <StatusCard
                    player={selectedPlayer}
                    players={players}
                    onUpdate={onUpdatePlayer}
                    onClose={() => onSelectPlayer(null)}
                    onRemove={onRemovePlayer}
                    position={cardPosition.position || {
                        x: window.innerWidth / 2 - 160,
                        y: window.innerHeight / 2 - 200,
                    }}
                    onDrag={handleDrag}
                    style={{ /* positionnement */ }}
                    roleAssigned={roleAssigned}
                />
            )}
        </section>
    );
}

export default GrimoireSection;