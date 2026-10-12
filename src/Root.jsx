import React, { useState } from 'react';
import App from './App.jsx';
import ModeSelect from './components/ModeSelect';
import PlayerApp from './multiplayer/PlayerApp';
import { loadHost, loadSession, roomFromUrl, saveHost, saveSession } from './multiplayer/session';

// Point d'entrée : un lien d'invitation ouvre la vue joueur ; sinon le Conteur
// choisit entre la partie locale (un seul écran) et la partie multijoueur.
export default function Root() {
  const [room] = useState(roomFromUrl);
  const [session, setSession] = useState(loadSession);

  const choose = (next) => {
    saveSession(next);
    setSession(next);
  };

  if (room) return <PlayerApp room={room} />;

  if (!session) {
    return (
      <ModeSelect
        onLocal={() => choose({ mode: 'local' })}
        onMulti={() => choose({ mode: 'multi', room: null, token: null, ...loadHost() })}
      />
    );
  }

  if (session.mode === 'multi') {
    return (
      <App
        key="multi"
        session={session}
        onSession={(host) => {
          saveHost(host);
          choose({ mode: 'multi', ...host });
        }}
        onQuit={() => choose(null)}
      />
    );
  }

  return <App key="local" onQuit={() => choose(null)} />;
}
