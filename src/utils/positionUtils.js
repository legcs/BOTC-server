export const calculateCirclePositions = (players, containerSize) => {
  const radius = Math.min(containerSize.width, containerSize.height) * 0.38;
  const centerX = containerSize.width / 2;
  const centerY = containerSize.height / 2;
  const positions = {};
  players.forEach((player, index) => {
    const angle = (index / players.length) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    positions[player.id] = { x, y };
  });
  return positions;
};




export const calculateNewPlayerPosition = (players, playerPositions, containerSize, tokenSize) => {
  const marginFromEdge = tokenSize;
  const spacing = tokenSize * 1.2;
  const x = marginFromEdge;
  
  const leftColumnPlayers = Object.entries(playerPositions)
    .filter(([_, pos]) => pos && pos.x < containerSize.width / 3)
    .map(([_, pos]) => pos.y);
  
  let y;
  if (leftColumnPlayers.length === 0) {
    y = containerSize.height / 2;
  } else {
    const maxY = Math.max(...leftColumnPlayers);
    y = maxY + spacing;
    
    if (y + tokenSize / 2 > containerSize.height - marginFromEdge) {
      y = marginFromEdge + tokenSize / 2;
    }
  }
  
  return { x, y };
};