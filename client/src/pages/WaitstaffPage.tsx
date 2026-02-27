import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import OrderForm from '../components/OrderForm';
import EditOrderModal from '../components/EditOrderModal';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns-tz';
import { API_BASE_URL } from '../utils/apiConfig';
import { fetchWithLoader } from '../utils/api';
import { OrderItem, Order } from '../types'; // Import from types.ts
import { useEvent } from '../context/EventContext'; // Import useEvent

import { QRCodeCanvas } from 'qrcode.react';
import '../components/QRModal.css';

const WaitstaffPage = () => {
    const socket = useSocket();
    const { token, user } = useAuth();
    const { currentEvent } = useEvent(); // Use currentEvent from context
    const [orders, setOrders] = useState<Order[]>([]);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);

    // Fetch initial orders via HTTP
    useEffect(() => {
        if (token && currentEvent) {
            fetchWithLoader(`${API_BASE_URL}/api/orders/event/${currentEvent._id}`, { // Fetch orders for current event
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.message) throw new Error(data.message);
                    setOrders(data);
                })
                .catch(err => console.error('Error fetching initial orders:', err));
        } else {
            setOrders([]); // Clear orders if no event is selected
        }
    }, [token, currentEvent]);

    useEffect(() => {
        if (!socket) return;

        const handleOrderUpdate = (updatedOrder: Order) => {
            setOrders(prevOrders => {
                // Only update if the order belongs to the current event
                if (currentEvent && updatedOrder.eventId.toString() !== currentEvent._id.toString()) {
                    return prevOrders;
                }

                const existingOrderIndex = prevOrders.findIndex(o => o._id === updatedOrder._id);
                if (existingOrderIndex !== -1) {
                    const newOrders = [...prevOrders];
                    newOrders[existingOrderIndex] = updatedOrder;
                    return newOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                } else {
                    return [...prevOrders, updatedOrder].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                }
            });
        };

        socket.on('order_update', handleOrderUpdate);

        return () => {
            socket.off('order_update', handleOrderUpdate);
        };
    }, [socket, currentEvent]);

    const handleCreateOrder = (order: { eventId: string; tableNumber: number; customerName?: string; items: OrderItem[]; isPreOrder: boolean; isPaid: boolean; deliveryAddress?: string }) => {
        return new Promise<void>((resolve, reject) => {
            if (socket) {
                socket.emit('new_order', order, (response: any) => {
                    if (response?.status === 'ok') {
                        resolve();
                    } else {
                        reject(new Error(response?.message || 'Failed to create order'));
                    }
                });
            } else {
                reject(new Error('No connection to server'));
            }
        });
    };

    const handleUpdateStatus = (orderId: string, status: Order['status']) => {
        if (socket) {
            socket.emit('update_order_status', { orderId, status });
        }
    };

    const handleEditOrder = (orderId: string, data: {
        tableNumber: number;
        customerName?: string;
        items: OrderItem[];
        isPreOrder: boolean;
        isPaid: boolean;
        deliveryAddress?: string;
    }) => {
        return new Promise<void>((resolve, reject) => {
            if (socket) {
                socket.emit('edit_order', { orderId, ...data }, (response: any) => {
                    if (response?.status === 'ok') {
                        resolve();
                    } else {
                        reject(new Error(response?.message || 'Failed to update order'));
                    }
                });
            } else {
                reject(new Error('No connection to server'));
            }
        });
    };

    const handleDownloadQR = () => {
        const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
        if (canvas) {
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `qr-menu-${currentEvent?.name.replace(/\s+/g, '-').toLowerCase()}.png`;
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
                    alert('QR Code copied to clipboard as image!');
                } catch (err) {
                    console.error('Clipboard error:', err);
                    alert('Failed to copy image. Your browser might not support this feature.');
                }
            }, 'image/png');
        } catch (err) {
            console.error('Error generating image blob:', err);
        }
    };

    const handleShare = async () => {
        const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
        if (!canvas || !navigator.share) {
            alert('Web Share is not supported on this browser.');
            return;
        }

        try {
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], 'qr-menu.png', { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `QR Menu for ${currentEvent?.name}`,
                        text: `Scan this QR to open the menu for ${currentEvent?.name}`,
                        url: menuUrl
                    });
                } else {
                    await navigator.share({
                        title: `QR Menu for ${currentEvent?.name}`,
                        text: `Open the menu for ${currentEvent?.name}: ${menuUrl}`,
                        url: menuUrl
                    });
                }
            }, 'image/png');
        } catch (err) {
            console.error('Share error:', err);
        }
    };

    const handleCopyLink = () => {
        if (!currentEvent) return;
        const url = `${window.location.origin}/menu/${currentEvent._id}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Menu link copied to clipboard!');
        });
    };

    const sortedOrders = orders.filter(o => o.status !== 'Collected').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const menuUrl = currentEvent ? `${window.location.origin}/menu/${currentEvent._id}` : '';

    return (
        <div>
            <h2>Create Order for {currentEvent ? `(${currentEvent.name})` : ''}</h2>
            {!currentEvent && <p>Please select an event from the Admin menu to create/view orders.</p>}
            {currentEvent && (
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => window.open(`/menu/${currentEvent._id}`, '_blank')}
                        className="action-btn"
                        style={{ background: '#2d3436', color: 'white' }}
                    >
                        📱 Open Menu
                    </button>
                    <button
                        onClick={() => setShowQRModal(true)}
                        className="action-btn"
                        style={{ background: '#0984e3', color: 'white' }}
                    >
                        📸 Share QR
                    </button>
                    <button
                        onClick={handleCopyLink}
                        className="action-btn"
                        style={{ background: '#f8f9fa', color: '#2d3436', border: '1px solid #dfe6e9' }}
                    >
                        🔗 Copy Link
                    </button>
                </div>
            )}

            {showQRModal && currentEvent && (
                <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
                    <div className="modal-content qr-modal" onClick={e => e.stopPropagation()}>
                        <h2>QR Menu for {currentEvent.name}</h2>
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
                        <button className="close-btn" onClick={() => setShowQRModal(false)}>Close</button>
                    </div>
                </div>
            )}
            {currentEvent && <OrderForm onSubmit={handleCreateOrder} />}
            {currentEvent && (
                <div className="orders-list-container">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>Order Number</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Status</th>
                                <th>Time</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOrders.map(order => (
                                <tr key={order._id} className={`status-${order.status.toLowerCase().replace(' ', '-')}`}>
                                    <td data-label="Order Number">{order.orderNumber}</td>
                                    <td data-label="Customer">{order.customerName || 'N/A'}</td>
                                    <td data-label="Items">
                                        <ul>
                                            {order.items.map(item => (
                                                <li key={item.menuItem._id}>
                                                    {item.quantity}x {item.menuItem.name}
                                                    {item.remarks && ` (${item.remarks})`}
                                                </li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td data-label="Status"><span className="status-badge">{order.status}</span></td>
                                    <td data-label="Time">{format(new Date(order.createdAt), 'p', { timeZone: userTimeZone })}</td>
                                    <td data-label="Action">
                                        <button
                                            className="icon-action-btn edit-btn"
                                            onClick={() => setEditingOrder(order)}
                                            title="Edit Order"
                                            aria-label={`Edit order ${order.orderNumber}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 20h9"></path>
                                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                            </svg>
                                        </button>
                                        {user && user.role === 'Waiter' && order.status === 'Ready' && (
                                            <button onClick={() => handleUpdateStatus(order._id, 'Collected')} className="action-btn collected-btn">
                                                Mark as Collected
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editingOrder && (
                <EditOrderModal
                    order={editingOrder}
                    onClose={() => setEditingOrder(null)}
                    onSubmit={handleEditOrder}
                />
            )}
        </div>
    );
};

export default WaitstaffPage;
