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

export interface UserLocation {
  user_id: string;
  user_name: string;
  user_picture?: string;
  latitude: number;
  longitude: number;
}

export interface ConnectedUser {
  user_id: string;
  user_name: string;
  user_picture?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [userTalking, setUserTalking] = useState<{ user_id: string; user_name: string; talking: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;

    // Connect to socket
    const socket = io(BACKEND_URL, {
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

    // Handle location updates
    socket.on('location_update', (data: { user_id: string; latitude: number; longitude: number }) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === data.user_id
            ? { ...u, location: { latitude: data.latitude, longitude: data.longitude } }
            : u
        )
      );
    });

    // Handle user talking status
    socket.on('user_talking', (data: { user_id: string; user_name: string; talking: boolean }) => {
      setUserTalking(data.talking ? data : null);
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

  const updateLocation = (latitude: number, longitude: number) => {
    if (!socketRef.current || !user) return;

    socketRef.current.emit('update_location', {
      user_id: user.user_id,
      latitude,
      longitude,
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

  const sendVoiceData = (audioData: string) => {
    if (!socketRef.current || !user) return;

    socketRef.current.emit('voice_data', {
      user_id: user.user_id,
      audio_data: audioData,
    });
  };

  const onVoiceStream = (callback: (data: { user_id: string; audio_data: string }) => void) => {
    if (!socketRef.current) return;
    socketRef.current.on('voice_stream', callback);
  };

  const offVoiceStream = () => {
    if (!socketRef.current) return;
    socketRef.current.off('voice_stream');
  };

  return {
    connected,
    messages,
    users,
    userTalking,
    sendMessage,
    updateLocation,
    startTalking,
    stopTalking,
    sendVoiceData,
    onVoiceStream,
    offVoiceStream,
  };
};
