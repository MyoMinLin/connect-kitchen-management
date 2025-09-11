import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import OrderForm from '../components/OrderForm';
import ReadyNotification from '../components/ReadyNotification';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns-tz';

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
    tableNumber: number;
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
    const [readyOrder, setReadyOrder] = useState<{ tableNumber: number; orderId: string } | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [error, setError] = useState('');

    // Fetch initial orders via HTTP
    useEffect(() => {
        if (token) {
            fetch('http://localhost:4000/api/orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.message) throw new Error(data.message);
                setOrders(data);
            })
            .catch(err => setError(err.message));
        }
    }, [token]);

    useEffect(() => {
        if (!socket) return;

        const handleReadyNotification = (data: { tableNumber: number; orderId: string }) => {
            console.log('Order is ready for pickup:', data);
            setReadyOrder(data);
            // Optional: Play a sound
            const audio = new Audio('/notification.mp3'); // Make sure you have this file in /public
            audio.play();
        };

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

        socket.on('order_ready_notification', handleReadyNotification);
        socket.on('order_update', handleOrderUpdate);

        return () => {
            socket.off('order_ready_notification', handleReadyNotification);
            socket.off('order_update', handleOrderUpdate);
        };
    }, [socket]);

    const handleCreateOrder = (order: { tableNumber: number; items: OrderItem[]; isPreOrder: boolean }) => {
        if (socket) {
            socket.emit('new_order', order);
        }
    };

    const handleUpdateStatus = (orderId: string, status: Order['status']) => {
        if (socket) {
            socket.emit('update_order_status', { orderId, status });
        }
    };

    const handleClearNotification = () => {
        if (socket && readyOrder) {
            // Mark the order as "Collected"
            handleUpdateStatus(readyOrder.orderId, 'Collected');
        }
        setReadyOrder(null);
    };

    const sortedOrders = orders.filter(o => o.status !== 'Collected').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;


    return (
        <div>
            <h1 className="page-title">Waitstaff Interface</h1>
            <OrderForm onSubmit={handleCreateOrder} />
            {readyOrder && (
                <ReadyNotification
                    tableNumber={readyOrder.tableNumber}
                    onClear={handleClearNotification}
                />
            )}
            <div className="orders-list-container">
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>Table</th>
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
                                <td data-label="Table">{order.tableNumber}</td>
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
