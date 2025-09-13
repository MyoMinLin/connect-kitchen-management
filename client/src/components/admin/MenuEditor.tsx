import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/apiConfig';
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
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('Main');
    const [requiresPrep, setRequiresPrep] = useState(true);

    // Edit state
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState('');
    const [editedPrice, setEditedPrice] = useState('');
    const [editedCategory, setEditedCategory] = useState('');
    const [editedRequiresPrep, setEditedRequiresPrep] = useState(false);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only digits and a single decimal point
        if (/^\d*\.?\d*$/.test(value)) {
            setPrice(value);
        }
    };

    const handleEditedPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) {
            setEditedPrice(value);
        }
    };

    // Generic API handler
    const api = (url: string, method: string, body?: any) => {
        return fetch(`${API_BASE_URL}/api${url}`,
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
        const newItem = { name, price: parseFloat(price), category, requiresPrep, eventId: selectedEvent };
        api('/menu-items', 'POST', newItem).then(() => {
            // Refresh list
            api(`/menu-items/event/${selectedEvent}`, 'GET').then(setMenuItems);
            // Reset form
            setName(''); setPrice(''); setCategory('Main'); setRequiresPrep(true);
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

    const handleEditItem = (item: IMenuItem) => {
        setEditingItemId(item._id);
        setEditedName(item.name);
        setEditedPrice(item.price.toString());
        setEditedCategory(item.category);
        setEditedRequiresPrep(item.requiresPrep);
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
    };

    const handleUpdateItem = (itemId: string) => {
        const updatedItem = {
            name: editedName,
            price: parseFloat(editedPrice),
            category: editedCategory,
            requiresPrep: editedRequiresPrep,
        };
        api(`/menu-items/${itemId}`, 'PUT', updatedItem).then(() => {
            // Refresh list
            api(`/menu-items/event/${selectedEvent}`, 'GET').then(setMenuItems);
            // Exit editing mode
            setEditingItemId(null);
        }).catch(err => setError(err.message));
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
                <input type="text" inputMode="decimal" placeholder="Price (¥)" value={price} onChange={handlePriceChange} required />
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
                                {editingItemId === item._id ? (
                                    <>
                                        <td><input type="text" value={editedName} onChange={e => setEditedName(e.target.value)} /></td>
                                        <td><input type="text" inputMode="decimal" value={editedPrice} onChange={handleEditedPriceChange} /></td>
                                        <td><input type="text" value={editedCategory} onChange={e => setEditedCategory(e.target.value)} /></td>
                                        <td><input type="checkbox" checked={editedRequiresPrep} onChange={e => setEditedRequiresPrep(e.target.checked)} /></td>
                                        <td>
                                            <button onClick={() => handleUpdateItem(item._id)} className="update-btn">Update</button>
                                            <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td>{item.name}</td>
                                        <td>¥{item.price}</td>
                                        <td>{item.category}</td>
                                        <td>{item.requiresPrep ? 'Yes' : 'No'}</td>
                                        <td>
                                            <button onClick={() => handleEditItem(item)} className="edit-btn">Edit</button>
                                            <button onClick={() => handleDeleteItem(item._id)} className="delete-btn">Delete</button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default MenuEditor;
