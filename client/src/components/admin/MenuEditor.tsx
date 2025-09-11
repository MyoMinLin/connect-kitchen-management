import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './UserManagement.css'; // Reusing styles

// Interfaces
interface IEvent {
    _id: string;
    name: string;
}

interface IMenuItem {
    _id: string;
    name: string;
    price: number;
    category: string;
    requiresPrep: boolean;
}

const MenuEditor = () => {
    const [events, setEvents] = useState<IEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string>('');
    const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { token } = useAuth();

    // Form state
    const [name, setName] = useState('');
    const [price, setPrice] = useState(0);
    const [category, setCategory] = useState('Main');
    const [requiresPrep, setRequiresPrep] = useState(true);

    // Generic API handler
    const api = (url: string, method: string, body?: any) => {
        return fetch(`http://localhost:4000/api${url}`,
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

    // Fetch events on component mount
    useEffect(() => {
        api('/events', 'GET').then(data => {
            setEvents(data);
            if (data.length > 0) {
                setSelectedEvent(data[0]._id);
            }
        }).catch(err => setError(err.message));
    }, []);

    // Fetch menu items when an event is selected
    useEffect(() => {
        if (selectedEvent) {
            setIsLoading(true);
            api(`/menu-items/event/${selectedEvent}`, 'GET')
                .then(setMenuItems)
                .catch(err => {
                    setError(err.message);
                    setMenuItems([]);
                })
                .finally(() => setIsLoading(false));
        }
    }, [selectedEvent]);

    const handleCreateItem = (e: React.FormEvent) => {
        e.preventDefault();
        const newItem = { name, price, category, requiresPrep, eventId: selectedEvent };
        api('/menu-items', 'POST', newItem).then(() => {
            // Refresh list
            api(`/menu-items/event/${selectedEvent}`, 'GET').then(setMenuItems);
            // Reset form
            setName(''); setPrice(0); setCategory('Main'); setRequiresPrep(true);
        }).catch(err => setError(err.message));
    };

    const handleDeleteItem = (itemId: string) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            api(`/menu-items/${itemId}`, 'DELETE').then(() => {
                // Refresh list
                api(`/menu-items/event/${selectedEvent}`, 'GET').then(setMenuItems);
            }).catch(err => setError(err.message));
        }
    };

    return (
        <div className="user-management-container"> 
            <h3>Menu Editor</h3>
            {error && <p className="error-message">{error}</p>}

            <div className="form-group">
                <label htmlFor="event-select">Select Event:</label>
                <select id="event-select" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                    {events.map(event => <option key={event._id} value={event._id}>{event.name}</option>)}
                </select>
            </div>

            <hr />

            <h4>Add New Menu Item</h4>
            <form onSubmit={handleCreateItem} className="user-form" style={{ flexWrap: 'wrap' }}>
                <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
                <input type="number" placeholder="Price" value={price} onChange={e => setPrice(Number(e.target.value))} required />
                <input type="text" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} required />
                <label><input type="checkbox" checked={requiresPrep} onChange={e => setRequiresPrep(e.target.checked)} /> Requires Prep?</label>
                <button type="submit">Add Item</button>
            </form>

            <hr />

            <h4>Existing Menu Items</h4>
            {isLoading ? <p>Loading...</p> : (
                <table className="users-table">
                    <thead><tr><th>Name</th><th>Price</th><th>Category</th><th>Prep?</th><th>Actions</th></tr></thead>
                    <tbody>
                        {menuItems.map(item => (
                            <tr key={item._id}>
                                <td>{item.name}</td>
                                <td>{item.price}</td>
                                <td>{item.category}</td>
                                <td>{item.requiresPrep ? 'Yes' : 'No'}</td>
                                <td><button onClick={() => handleDeleteItem(item._id)} className="delete-btn">Delete</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default MenuEditor;
