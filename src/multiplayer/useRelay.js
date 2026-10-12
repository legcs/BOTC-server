import { useCallback, useEffect, useRef, useState } from 'react';

const RELAY_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
const RETRY_DELAY = 1500;
// Codes de fermeture envoyés par le relais : inutile de se reconnecter
const FINAL_CODES = [4000, 4001];

// Connexion au relais, rétablie automatiquement en cas de coupure.
// `hello` fournit le message d'identification envoyé à chaque (re)connexion.
export function useRelay({ enabled = true, hello, onMessage }) {
  const [status, setStatus] = useState('connecting');
  const socketRef = useRef(null);
  const helloRef = useRef(hello);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    helloRef.current = hello;
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let disposed = false;
    let retry = null;

    const connect = () => {
      const socket = new WebSocket(RELAY_URL);
      socketRef.current = socket;
      socket.onopen = () => {
        setStatus('online');
        const message = helloRef.current?.();
        if (message) socket.send(JSON.stringify(message));
      };
      socket.onmessage = (event) => onMessageRef.current?.(JSON.parse(event.data));
      socket.onclose = (event) => {
        if (disposed) return;
        if (FINAL_CODES.includes(event.code)) {
          setStatus('closed');
          return;
        }
        setStatus('connecting');
        retry = setTimeout(connect, RETRY_DELAY);
      };
    };
    connect();

    return () => {
      disposed = true;
      clearTimeout(retry);
      socketRef.current?.close();
    };
  }, [enabled]);

  const send = useCallback((message) => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    return true;
  }, []);

  return { status, send };
}
