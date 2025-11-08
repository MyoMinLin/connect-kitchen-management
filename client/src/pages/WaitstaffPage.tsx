import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import OrderForm from '../components/OrderForm';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns-tz';
import { API_BASE_URL } from '../utils/apiConfig';

import { fetchWithLoader } from '../utils/api';

// --- Data Models ---
export interface MenuItem {
    _id: string;
    name: string;
    price: number;
    category: string;
    requiresPrep: boolean;
}

export interface OrderItem {
    menuItem: string; // Just the ID
    quantity: number;
    remarks?: string; // Optional remarks for the item
}

export interface Order {
    _id: string;
    orderNumber: string;
    tableNumber?: string;
    customerName?: string; // New field for customer name
    isPreOrder: boolean;
    items: { menuItem: MenuItem; quantity: number; remarks?: string }[]; // Added remarks
    status: 'New' | 'Preparing' | 'Ready' | 'Collected';
    createdAt: string;
    preparingStartedAt?: string;
    readyAt?: string;
    collectedAt?: string;
}

export interface Event {
    _id: string;
    name: string;
    description?: string;
    eventDate: string; // Use string for date as it comes from API
}

const WaitstaffPage = () => {
    const socket = useSocket();
    const { token, user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);

    // Fetch initial orders via HTTP
    useEffect(() => {
        if (token) {
            fetchWithLoader(`${API_BASE_URL}/api/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.message) throw new Error(data.message);
                setOrders(data);
            })
            .catch(err => console.error('Error fetching initial orders:', err));
        }
    }, [token]);

    useEffect(() => {
        if (!socket) return;

        const handleOrderUpdate = (updatedOrder: Order) => {
            setOrders(prevOrders => {
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
    }, [socket]);

    const handleCreateOrder = (order: { eventId: string; tableNumber?: string; customerName?: string; items: OrderItem[]; isPreOrder: boolean; isPaid: boolean; deliveryAddress?: string }) => {
        if (socket) {
            socket.emit('new_order', order);
        }
    };

    const handleUpdateStatus = (orderId: string, status: Order['status']) => {
        if (socket) {
            socket.emit('update_order_status', { orderId, status });
        }
    };

    const sortedOrders = orders.filter(o => o.status !== 'Collected').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
        <div>
            <OrderForm onSubmit={handleCreateOrder} />
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
        </div>
    );
};

export default WaitstaffPage;
