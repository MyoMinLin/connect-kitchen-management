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


import { useTranslation } from 'react-i18next';
import '../pages/WaitstaffPage.css';

const WaitstaffPage = () => {
    const socket = useSocket();
    const { token, user } = useAuth();
    const { currentEvent } = useEvent(); // Use currentEvent from context
    const [orders, setOrders] = useState<Order[]>([]);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const { t } = useTranslation();

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

    const handleCreateOrder = (order: { eventId: string; seatNumber?: string; customerName?: string; items: OrderItem[]; isPreOrder: boolean; isPaid: boolean; deliveryAddress?: string }) => {
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
        seatNumber?: string;
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

    const sortedOrders = orders.filter(o => o.status !== 'Collected').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
        <div className="waitstaff-page">
            <h2 className="page-title">{t('waitstaff.createOrderFor')} {currentEvent ? `(${currentEvent.name})` : ''}</h2>
            {!currentEvent && <p>{t('waitstaff.selectEventPrompt')}</p>}

            {currentEvent && <OrderForm onSubmit={handleCreateOrder} />}
            {currentEvent && (
                <div className="orders-list-container">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>{t('waitstaff.orderNumber')}</th>
                                <th>{t('common.seat')}</th>
                                <th>{t('common.customer')}</th>
                                <th>{t('common.items')}</th>
                                <th>{t('common.status')}</th>
                                <th>{t('common.time')}</th>
                                <th>{t('common.action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOrders.map(order => (
                                <tr key={order._id} className={`status-${order.status.toLowerCase().replace(' ', '-')}`}>
                                    <td data-label="Order Number">{order.orderNumber}</td>
                                    <td data-label="Seat">{order.seatNumber || '—'}</td>
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
                                                {t('waitstaff.markAsCollected')}
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
