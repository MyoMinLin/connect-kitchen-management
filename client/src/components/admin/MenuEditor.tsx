import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/apiConfig';
import { fetchWithLoader } from '../../utils/api';
import './UserManagement.css'; // Reusing styles
import './MenuEditor.css';
import MenuEditModal from './MenuEditModal';

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
    imageUrl?: string;
}

const MenuEditor = () => {
    const [events, setEvents] = useState<IEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string>('');
    const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
    const [error, setError] = useState('');
    const { token } = useAuth();

    // Form state (for creation)
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('Main');
    const [requiresPrep, setRequiresPrep] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');

    // Edit Modal state
    const [editingItem, setEditingItem] = useState<IMenuItem | null>(null);

    const addImageInputRef = useRef<HTMLInputElement>(null);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) setPrice(value);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // Upload image to server → Cloudinary, returns CDN URL
    const uploadImage = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        if (!res.ok) throw new Error('Image upload failed');
        const data = await res.json();
        return data.url;
    };

    // Generic JSON API handler
    const api = useCallback((url: string, method: string, body?: any) => {
        return fetchWithLoader(`${API_BASE_URL}/api${url}`,
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

    // Fetch events on component mount
    useEffect(() => {
        api('/events', 'GET').then(data => {
            setEvents(data);
            if (data.length > 0) setSelectedEvent(data[0]._id);
        }).catch(err => setError(err.message));
    }, [api]);

    // Fetch menu items when an event is selected
    useEffect(() => {
        if (selectedEvent) {
            api(`/menu-items/event/${selectedEvent}`, 'GET')
                .then(setMenuItems)
                .catch(err => {
                    setError(err.message);
                    setMenuItems([]);
                });
        }
    }, [selectedEvent, api]);

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let imageUrl: string | undefined;
            if (imageFile) imageUrl = await uploadImage(imageFile);

            const newItem = { name, price: parseFloat(price), category, requiresPrep, eventId: selectedEvent, imageUrl };
            await api('/menu-items', 'POST', newItem);

            // Refresh list & reset form
            const updated = await api(`/menu-items/event/${selectedEvent}`, 'GET');
            setMenuItems(updated);
            setName(''); setPrice(''); setCategory('Main'); setRequiresPrep(true);
            setImageFile(null); setImagePreview('');
            if (addImageInputRef.current) addImageInputRef.current.value = '';
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteItem = (itemId: string) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            api(`/menu-items/${itemId}`, 'DELETE').then(() => {
                api(`/menu-items/event/${selectedEvent}`, 'GET').then(setMenuItems);
            }).catch(err => setError(err.message));
        }
    };

    const handleUpdateItem = async (itemId: string, updatedData: any) => {
        try {
            await api(`/menu-items/${itemId}`, 'PUT', updatedData);
            const updated = await api(`/menu-items/event/${selectedEvent}`, 'GET');
            setMenuItems(updated);
            setEditingItem(null);
        } catch (err: any) {
            setError(err.message);
            throw err;
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
            <form onSubmit={handleCreateItem} className="user-form">
                <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
                <input type="text" inputMode="decimal" placeholder="Price (¥)" value={price} onChange={handlePriceChange} required />
                <input type="text" placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} required />
                <label><input type="checkbox" checked={requiresPrep} onChange={e => setRequiresPrep(e.target.checked)} /> Requires Prep?</label>

                {/* Image Upload */}
                <div className="menu-image-upload">
                    <label className="menu-image-label">
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="menu-image-preview" />
                        ) : (
                            <div className="menu-image-placeholder">
                                <span className="menu-image-icon">📷</span>
                                <span>Add Image</span>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            ref={addImageInputRef}
                            onChange={handleImageChange}
                            className="menu-image-input"
                        />
                    </label>
                    {imagePreview && (
                        <button
                            type="button"
                            className="menu-image-remove-btn"
                            onClick={() => { setImageFile(null); setImagePreview(''); if (addImageInputRef.current) addImageInputRef.current.value = ''; }}
                        >
                            ✕ Remove
                        </button>
                    )}
                </div>

                <button type="submit">Add Item</button>
            </form>

            <hr />

            <h4>Existing Menu Items</h4>
            <div className="users-table-container">
                <table className="users-table menu-editor-table">
                    <thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Category</th><th>Prep?</th><th>Actions</th></tr></thead>
                    <tbody>
                        {menuItems.map(item => (
                            <tr key={item._id}>
                                <td>
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="menu-table-thumb" />
                                    ) : (
                                        <div className="menu-table-thumb-placeholder">🍽️</div>
                                    )}
                                </td>
                                <td>{item.name}</td>
                                <td>¥{item.price}</td>
                                <td>{item.category}</td>
                                <td>{item.requiresPrep ? 'Yes' : 'No'}</td>
                                <td>
                                    <button onClick={() => setEditingItem(item)} className="edit-btn">Edit</button>
                                    <button onClick={() => handleDeleteItem(item._id)} className="delete-btn">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingItem && (
                <MenuEditModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onUpdate={handleUpdateItem}
                    uploadImage={uploadImage}
                />
            )}
        </div>
    );
};

export default MenuEditor;
