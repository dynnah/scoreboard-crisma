import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { AppState } from "../types";

let socketSingleton: Socket | null = null;

function getSocket(): Socket {
  if (!socketSingleton) {
    socketSingleton = io();
  }
  return socketSingleton;
}

export function useSocketState() {
  const [state, setState] = useState<AppState | null>(null);
  const [connected, setConnected] = useState(false);
  // Diferença entre o relógio do servidor e o deste navegador. O cronômetro
  // é calculado localmente a partir de Date.now(), então sem esse ajuste um
  // relógio desregulado faz a contagem exibida ficar adiantada ou atrasada
  // enquanto o timer está rodando (mesmo com o servidor certo).
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const socket = getSocket();

  useEffect(() => {
    const onSync = (s: AppState & { serverNow: number }) => {
      setState(s);
      setClockOffsetMs(s.serverNow - Date.now());
    };
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("state:sync", onSync);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setConnected(socket.connected);

    return () => {
      socket.off("state:sync", onSync);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  return { state, connected, socket, clockOffsetMs };
}
