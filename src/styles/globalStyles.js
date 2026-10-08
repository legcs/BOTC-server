export const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent; /* Supprime le surlignage au toucher */
  touch-action: manipulation; /* Améliore la réactivité tactile */
}

html, body, #root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  font-size: 16px; /* Taille de base pour le rem */
  overflow-x: hidden; /* Évite le défilement horizontal indésirable */
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

/* Adaptation des tokens pour mobile */
.player-token {
  min-width: 60px;
  min-height: 60px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.player-token:hover {
  transform: scale(1.15);
  z-index: 50 !important;
}

.player-token:active {
  cursor: grabbing;
  transform: scale(1.1); /* Feedback tactile */
}

/* Amélioration des animations pour mobile */
.night-step {
  transition: all 0.2s ease;
  min-height: 50px; /* Meilleure taille pour le tactile */
  padding: 0.5rem;
}

.night-step:hover {
  background: rgba(201, 165, 92, 0.15) !important;
  transform: translateX(4px);
}

/* Scrollbar adapté pour mobile */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
::-webkit-scrollbar-thumb { background: rgba(139,69,69,0.4); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(139,69,69,0.6); }

/* Adaptations mobiles */

@media (max-width: 850px) {
  .night-step {
    max-width: 100% !important;

  }
    .journal {
    max-height: 240px;
    overflow-y: scroll;
  }
  .title {
    display: none !important;
  }
  .main-layout {
    flex-direction: column !important;
  }
  .sidebar-section{
  max-width: 100% !important;
  max-height: 300px !important;
  }
  .grimoire-section {
    height: 55vh !important;
    min-height: 350px !important;
  }
  .sidebar-section {
    width: 100% !important;
    height: 400px !important;
    flex-direction: row !important;
    overflow-x: auto; /* Permet le défilement horizontal si nécessaire */
  }
  .sidebar-panel {
    flex: 1 !important;
    max-height: 300px !important;
    min-width: 200px; /* Largeur minimale pour éviter le sur-zoom */
  }
  /* Taille de police adaptée */
  html {
    font-size: 14px; /* Réduit légèrement la taille de base */
  }
  /* Boutons plus adaptés au tactile */
  button {
    min-width: 25px;
    min-height: 40px;
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }
}

/* Arrière-plans jour/nuit */
.day-background, .night-background {
  transition: opacity 1.5s ease; /* Animation plus fluide sur mobile */
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: opacity; /* Optimisation des performances */
}

.day-background.active {
  opacity: 1;
  z-index: 2;
}

.day-background.inactive {
  opacity: 0;
  z-index: 1;
}

.night-background.active {
  opacity: 1;
  z-index: 2;
}

.night-background.inactive {
  opacity: 0;
  z-index: 1;
}

/* Texte plein écran adapté */
.fullscreen-text {
  display: none;
  font-size: 1.2rem; /* Meilleure lisibilité */
}

@media (min-width: 640px) {
  .fullscreen-text {
    display: inline;
  }
}

/* Animations optimisées */
@keyframes victoryPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 10px 30px rgba(74, 222, 128, 0.3);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 15px 40px rgba(74, 222, 128, 0.5);
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); } /* Réduction de l'amplitude */
}

.help-text {
  display: none;
  font-size: 0.9rem; /* Meilleure lisibilité */
}

@media (min-width: 768px) {
  .help-text {
    display: inline;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Optimisation des polices */
body {
  font-family: 'Crimson Text', serif;
  line-height: 1.5;
}

/* Meilleure gestion des clics tactiles */
button, [role="button"] {
  -webkit-tap-highlight-color: rgba(0,0,0,0);
  cursor: pointer;
  user-select: none; /* Évite la sélection de texte accidentelle */
}
`;