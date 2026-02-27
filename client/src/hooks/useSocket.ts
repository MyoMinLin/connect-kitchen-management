import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/apiConfig';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_SERVER_URL || API_BASE_URL;

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const { token, logout } = useAuth(); // Destructure logout

    useEffect(() => {
        const newSocket = io(SOCKET_SERVER_URL, {
            auth: {
                token: token || undefined
            }
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            // Only logout if an EXPLICIT authentication error is returned for a provided token
            if (token && err.message.includes('Authentication error')) {
                logout();
            }
        });

        newSocket.on('auth_error', (message: string) => {
            console.error('Socket authentication error:', message);
            if (token) logout();
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, logout]);

    return socket;
};
