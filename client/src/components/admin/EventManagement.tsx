import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/apiConfig';
import { fetchWithLoader } from '../../utils/api';
import './UserManagement.css'; // Reusing styles
import '../QRModal.css';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';

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
    const [selectedQR, setSelectedQR] = useState<IEvent | null>(null);
    const { token } = useAuth();

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
        api('/', 'GET').then(setEvents).catch(err => setError(err.message));
    }, [api]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

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

    const handleDownloadQR = () => {
        const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
        if (canvas) {
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `qr-menu-${selectedQR?.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.href = url;
            link.click();
        }
    };

    const handleCopyAsImage = async () => {
        const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
        if (!canvas) return;

        try {
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast.success('QR Code copied to clipboard as image!');
                } catch (err) {
                    console.error('Clipboard error:', err);
                    toast.error('Failed to copy image. Your browser might not support this feature.');
                }
            }, 'image/png');
        } catch (err) {
            console.error('Error generating image blob:', err);
        }
    };

    const handleShare = async () => {
        const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
        if (!canvas || !navigator.share) {
            toast.error('Web Share is not supported on this browser.');
            return;
        }

        try {
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], 'qr-menu.png', { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `QR Menu for ${selectedQR?.name}`,
                        text: `Scan this QR to open the menu for ${selectedQR?.name}`,
                        url: menuUrl
                    });
                } else {
                    await navigator.share({
                        title: `QR Menu for ${selectedQR?.name}`,
                        text: `Open the menu for ${selectedQR?.name}: ${menuUrl}`,
                        url: menuUrl
                    });
                }
            }, 'image/png');
        } catch (err) {
            console.error('Share error:', err);
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/menu/${selectedQR?._id}`;
        navigator.clipboard.writeText(url).then(() => {
            toast.success('Menu link copied to clipboard!');
        });
    };

    const menuUrl = selectedQR ? `${window.location.origin}/menu/${selectedQR._id}` : '';

    return (
        <div className="user-management-container">
            <h3>Manage Events</h3>
            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleCreateEvent} className="user-form">
                <input type="text" placeholder="Event Name" value={eventName} onChange={e => setEventName(e.target.value)} required />
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
                <button type="submit">Create Event</button>
            </form>

            <div className="users-table-container">
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
                                <td className="actions-cell">
                                    <button onClick={() => setSelectedQR(event)} className="edit-btn">Show QR</button>
                                    <button onClick={() => handleDeleteEvent(event._id)} className="delete-btn">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedQR && (
                <div className="modal-overlay" onClick={() => setSelectedQR(null)}>
                    <div className="modal-content qr-modal" onClick={e => e.stopPropagation()}>
                        <h2>QR Menu for {selectedQR.name}</h2>
                        <div className="qr-container">
                            <QRCodeCanvas
                                id="qr-code-canvas"
                                value={menuUrl}
                                size={256}
                                level="H"
                                includeMargin={true}
                            />
                        </div>
                        <div className="qr-actions">
                            <button onClick={handleCopyAsImage} className="copy-image-btn" title="Copy QR as Image">
                                📋 Copy Image
                            </button>
                            {!!navigator.share && (
                                <button onClick={handleShare} className="share-btn" title="Share QR">
                                    📤 Share
                                </button>
                            )}
                            <button onClick={handleDownloadQR} className="download-btn" title="Download as PNG">
                                ⬇️ Download
                            </button>
                        </div>
                        <div className="qr-link-section">
                            <p className="qr-url">{menuUrl}</p>
                            <button onClick={handleCopyLink} className="copy-link-btn" title="Copy Menu URL">
                                🔗 Copy Link
                            </button>
                        </div>
                        <p className="qr-hint">Scan or share this to open the menu and order.</p>
                        <button className="close-btn" onClick={() => setSelectedQR(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventManagement;
