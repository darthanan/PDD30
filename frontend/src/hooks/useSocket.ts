import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface Message {
  message_id: string;
  user_id: string;
  user_name: string;
  user_picture?: string;
  text: string;
  timestamp: string;
}

export interface ConnectedUser {
  user_id: string;
  user_name: string;
  user_picture?: string;
}

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [userTalking, setUserTalking] = useState<{ user_id: string; user_name: string; talking: boolean } | null>(null);
  // Ref to store the voice stream callback so it doesn't need to be in the socket event listener closure
  const voiceStreamCallbackRef = useRef<((data: { user_id: string; audio_data: string }) => void) | null>(null);

  useEffect(() => {
    if (!user) return;

    // Connect to socket
    const socket = io(BACKEND_URL, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      
      // Join the group
      socket.emit('join_group', {
        user_id: user.user_id,
        user_name: user.name,
        user_picture: user.picture,
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    // Handle new messages
    socket.on('new_message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Handle users list
    socket.on('users_list', (data: { users: ConnectedUser[] }) => {
      setUsers(data.users);
    });

    // Handle user joined
    socket.on('user_joined', (userData: ConnectedUser) => {
      setUsers((prev) => [...prev, userData]);
    });

    // Handle user disconnected
    socket.on('user_disconnected', (data: { user_id: string }) => {
      setUsers((prev) => prev.filter((u) => u.user_id !== data.user_id));
    });

    // Handle user talking status
    socket.on('user_talking', (data: { user_id: string; user_name: string; talking: boolean }) => {
      setUserTalking(data.talking ? data : null);
    });

    // Route incoming voice audio to whichever callback is currently registered
    socket.on('voice_stream', (data: { user_id: string; audio_data: string }) => {
      if (voiceStreamCallbackRef.current) {
        voiceStreamCallbackRef.current(data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const sendMessage = (text: string) => {
    if (!socketRef.current || !user) return;

    socketRef.current.emit('send_message', {
      user_id: user.user_id,
      user_name: user.name,
      user_picture: user.picture,
      text,
    });
  };

  const startTalking = () => {
    if (!socketRef.current || !user) return;

    socketRef.current.emit('start_talking', {
      user_id: user.user_id,
      user_name: user.name,
    });
  };

  const stopTalking = () => {
    if (!socketRef.current || !user) return;

    socketRef.current.emit('stop_talking', {
      user_id: user.user_id,
    });
  };

  /** Send a complete audio clip as a base64 string to all other users */
  const sendVoiceData = (audioData: string) => {
    if (!socketRef.current || !user) return;

    socketRef.current.emit('voice_data', {
      user_id: user.user_id,
      audio_data: audioData,
    });
  };

  /** Register a callback that fires whenever a voice_stream event arrives */
  const onVoiceStream = (callback: (data: { user_id: string; audio_data: string }) => void) => {
    voiceStreamCallbackRef.current = callback;
  };

  /** Unregister the voice_stream callback */
  const offVoiceStream = () => {
    voiceStreamCallbackRef.current = null;
  };

  return {
    connected,
    messages,
    users,
    userTalking,
    sendMessage,
    startTalking,
    stopTalking,
    sendVoiceData,
    onVoiceStream,
    offVoiceStream,
  };
};
