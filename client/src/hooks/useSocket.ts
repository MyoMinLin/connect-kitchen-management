import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/apiConfig';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_SERVER_URL || API_BASE_URL;

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const { token, logout } = useAuth(); // Destructure logout

    useEffect(() => {
        if (token) {
            const newSocket = io(SOCKET_SERVER_URL, {
                auth: {
                    token
                }
            });

            newSocket.on('connect_error', (err) => {
                console.error('Socket connection error:', err.message);
                // If connection error is due to invalid token, logout
                if (err.message.includes('Authentication error')) { // Check for specific message from server
                    logout();
                }
            });

            // Listen for a custom 'auth_error' event from the server if it sends one
            newSocket.on('auth_error', (message: string) => {
                console.error('Socket authentication error:', message);
                logout();
            });

            setSocket(newSocket);

            return () => {
                newSocket.close();
            };
        } else if (socket) { // If token becomes null while socket is active, close it
            socket.close();
            setSocket(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, logout]); // Add logout to dependency array

    return socket;
};
