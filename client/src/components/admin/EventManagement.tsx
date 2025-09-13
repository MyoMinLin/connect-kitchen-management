import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/apiConfig';
import './UserManagement.css'; // Reusing styles

interface IEvent {
    _id: string;
    name: string;
    description?: string;
    eventDate: string;
}

const EventManagement = () => {
    const [events, setEvents] = useState<IEvent[]>([]);
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [error, setError] = useState('');
    const { token } = useAuth();

    const api = (endpoint: string, method: string, body?: any) => {
        return fetch(`${API_BASE_URL}/api/events${endpoint}`,
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
    }

    const fetchEvents = () => {
        api('/', 'GET').then(setEvents).catch(err => setError(err.message));
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleCreateEvent = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        api('/', 'POST', { name: eventName, eventDate })
            .then(() => {
                fetchEvents();
                setEventName('');
                setEventDate('');
            })
            .catch(err => setError(err.message));
    };

    const handleDeleteEvent = (eventId: string) => {
        if (window.confirm('Are you sure you want to delete this event? This will also delete its menu items.')) {
            api(`/${eventId}`, 'DELETE').then(() => fetchEvents()).catch(err => setError(err.message));
        }
    };

    return (
        <div className="user-management-container"> {/* Reusing class for styling */}
            <h3>Manage Events</h3>
            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleCreateEvent} className="user-form">
                <input type="text" placeholder="Event Name" value={eventName} onChange={e => setEventName(e.target.value)} required />
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
                <button type="submit">Create Event</button>
            </form>

            <table className="users-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map(event => (
                        <tr key={event._id}>
                            <td>{event.name}</td>
                            <td>{new Date(event.eventDate).toLocaleDateString()}</td>
                            <td>
                                <button onClick={() => handleDeleteEvent(event._id)} className="delete-btn">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default EventManagement;
