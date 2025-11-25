import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../utils/apiConfig';
import { fetchWithLoader } from '../utils/api';

interface IEvent {
    _id: string;
    name: string;
    description?: string;
    eventDate: string;
}

interface EventContextType {
    currentEvent: IEvent | null;
    events: IEvent[];
    setCurrentEvent: (event: IEvent | null) => void;
    fetchEvents: () => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider = ({ children }: { children: ReactNode }) => {
    const { token } = useAuth();
    const [currentEvent, setCurrentEvent] = useState<IEvent | null>(() => {
        const storedEvent = localStorage.getItem('currentEvent');
        return storedEvent ? JSON.parse(storedEvent) : null;
    });
    const [events, setEvents] = useState<IEvent[]>([]);

    const api = useCallback((endpoint: string, method: string, body?: any) => {
        return fetchWithLoader(`${API_BASE_URL}/api/events${endpoint}`,
            {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: body ? JSON.stringify(body) : undefined
            }
        ).then(async res => {
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'An error occurred');
            }
            return res.json();
        });
    }, [token]);

    const fetchEvents = useCallback(() => {
        if (token) {
            api('/active', 'GET').then(data => {
                setEvents(data);
                if (data && data.length > 0) {
                    setCurrentEvent(data[0]);
                } else {
                    setCurrentEvent(null);
                }
            }).catch(err => console.error("Failed to fetch events:", err.message));
        }
    }, [api, token]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        if (currentEvent) {
            localStorage.setItem('currentEvent', JSON.stringify(currentEvent));
        } else {
            localStorage.removeItem('currentEvent');
        }
    }, [currentEvent]);

    return (
        <EventContext.Provider value={{ currentEvent, events, setCurrentEvent, fetchEvents }}>
            {children}
        </EventContext.Provider>
    );
};

export const useEvent = () => {
    const context = useContext(EventContext);
    if (context === undefined) {
        throw new Error('useEvent must be used within an EventProvider');
    }
    return context;
};
