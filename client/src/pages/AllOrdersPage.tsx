
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Order, Event as EventType } from '../types';
import { useSocket } from '../hooks/useSocket';
import { API_BASE_URL } from '../utils/apiConfig';
import './AllOrdersPage.css';
import { format } from 'date-fns';

import { fetchWithLoader } from '../utils/api';

const AllOrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeEvent, setActiveEvent] = useState<EventType | null>(null);
    const {  } = useAuth(); // Removed 'user' as it's unused
    const socket = useSocket();

    useEffect(() => {
        const fetchActiveEvent = async () => {
            try {
                const response = await fetchWithLoader(`${API_BASE_URL}/api/events/active`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (!response.ok) throw new Error('Failed to fetch active event');
                const events = await response.json();
                if (events.length > 0) {
                    const event = events[0];
                    setActiveEvent(event);
                    fetchOrders(event._id); // Call fetchOrders immediately after setting activeEvent
                } else {
                    // If no active event, clear orders or show a message
                    setOrders([]);
                }
            } catch (error) {
                console.error('Error fetching active event:', error);
                setOrders([]); // Clear orders on error
            }
        };
        fetchActiveEvent();
    }, []); // This useEffect now handles both event and initial order fetching

    const fetchOrders = async (eventId: string) => {
        try {
            const response = await fetchWithLoader(`${API_BASE_URL}/api/orders?eventId=${eventId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Failed to fetch orders');
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setOrders([]); // Clear orders on error
        }
    };

    useEffect(() => {
        // This useEffect is now only for socket updates, as initial fetchOrders is handled above.
        // The dependency on activeEvent is still needed for socket updates related to the current event.
        if (socket) {
            const handleOrderUpdate = (updatedOrder: Order) => {
                setOrders(prevOrders => {
                    const existingOrderIndex = prevOrders.findIndex(o => o._id === updatedOrder._id);
                    if (existingOrderIndex !== -1) {
                        const newOrders = [...prevOrders];
                        newOrders[existingOrderIndex] = updatedOrder;
                        return newOrders;
                    } else {
                        return [updatedOrder, ...prevOrders];
                    }
                });
            };

            socket.on('order_update', handleOrderUpdate);

            return () => {
                socket.off('order_update', handleOrderUpdate);
            };
        }
    }, [socket, activeEvent]);

    const handleMarkAsCollected = (orderId: string) => {
        if (socket) {
            socket.emit('update_order_status', { orderId, status: 'Collected' });
        }
    };

    const sortOrders = (orders: Order[]) => {
        return orders.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt);
            const dateB = new Date(b.updatedAt || b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
    };

    const activeOrders = useMemo(() => sortOrders(orders.filter(order => order.status !== 'Collected')), [orders]);
    const collectedOrders = useMemo(() => sortOrders(orders.filter(order => order.status === 'Collected')), [orders]);

    const calculateOrderTotal = (order: Order) => {
        const total = order.items.reduce((sum, item) => sum + (item.quantity * (item.menuItem.price || 0)), 0);
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(total);
    };

    const aggregateItems = (items: Order['items']) => {
        const itemMap = new Map<string, { quantity: number; remarks: string[] }>();
        items.forEach(item => {
            const key = item.menuItem.name;
            const existing = itemMap.get(key);
            if (existing) {
                existing.quantity += item.quantity;
                if (item.remarks) existing.remarks.push(item.remarks);
            } else {
                itemMap.set(key, {
                    quantity: item.quantity,
                    remarks: item.remarks ? [item.remarks] : [],
                });
            }
        });
        return Array.from(itemMap.entries()).map(([name, data]) => ({
            name,
            ...data,
        }));
    };

    return (
        <div className="all-orders-page">
            <h1>လက်ရှိအော်ဒါများ</h1>
            <div className="orders-list-container">
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>Order Number</th>
                            <th>Table</th>
                            <th>Customer</th>
                            <th>Item</th>
                            <th>Total Amount</th>
                            <th>Ordered At</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeOrders.map(order => (
                            <tr key={order._id} className={`status-${order.status.toLowerCase()}`}>
                                <td data-label="Order Number">
                                    {order.isPreOrder && <span className="pre-order-indicator">Pre</span>}
                                    {order.orderNumber}
                                </td>
                                <td data-label="Table">{order.tableNumber || '-'}</td>
                                <td data-label="Customer">{order.customerName || '-'}</td>
                                <td data-label="Item">
                                    <ul>
                                        {aggregateItems(order.items).map((item, index) => (
                                            <li key={index}>
                                                {item.quantity}x {item.name}
                                                {item.remarks.length > 0 && <span className="item-remarks"> ({item.remarks.join(', ')})</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td data-label="Total Amount">{calculateOrderTotal(order)}</td>
                                <td data-label="Ordered At">{format(new Date(order.createdAt), 'p')}</td>
                                <td data-label="Status">
                                    <span className="status-badge">{order.status}</span>
                                </td>
                                <td data-label="Action">
                                    {order.status === 'Ready' && (
                                        <button
                                            className="action-btn collected-btn"
                                            onClick={() => handleMarkAsCollected(order._id)}
                                        >
                                            Mark as Collected
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {collectedOrders.length > 0 && (
                <>
                    <h2 className="collected-orders-title">Collected Orders</h2>
                    <div className="orders-list-container">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Order Number</th>
                                    <th>Table</th>
                                    <th>Customer</th>
                                    <th>Item</th>
                                    <th>Ordered At</th>
                                    <th>Total Amount</th>
                                                                <th>Total Amount</th>
                                                                <th>Status</th>
                                                            </tr>
                                                        </thead>
                                                                <tbody>
                                                                    {collectedOrders.map(order => (
                                                                        <tr key={order._id} className={`status-${order.status.toLowerCase()}`}>
                                                                            <td data-label="Order Number">
                                                                                {order.isPreOrder && <span className="pre-order-indicator">Pre</span>}
                                                                                {order.orderNumber}
                                                                            </td>
                                                                            <td data-label="Table">{order.tableNumber || '-'}</td>
                                                                            <td data-label="Customer">{order.customerName || '-'}</td>
                                                                            <td data-label="Item">
                                                                                <ul>
                                                                                    {aggregateItems(order.items).map((item, index) => (
                                                                                        <li key={index}>
                                                                                            {item.quantity}x {item.name}
                                                                                            {item.remarks.length > 0 && <span className="item-remarks"> ({item.remarks.join(', ')})</span>}
                                                                                        </li>
                                                                                    ))}
                                                                                </ul>
                                                                            </td>
                                                                            <td data-label="Total Amount">{calculateOrderTotal(order)}</td>
                                                                            <td data-label="Ordered At">{format(new Date(order.createdAt), 'p')}</td>
                                                                            <td data-label="Status">
                                                                                <span className="status-badge">{order.status}</span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default AllOrdersPage;
