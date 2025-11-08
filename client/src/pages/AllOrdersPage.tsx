
import React, { useState, useEffect, useMemo } from 'react';
import { Order } from '../types';
import { useSocket } from '../hooks/useSocket';
import { useEvent } from '../context/EventContext'; // Import useEvent
import { API_BASE_URL } from '../utils/apiConfig';
import './AllOrdersPage.css';
import { format } from 'date-fns';

import { fetchWithLoader } from '../utils/api';

const AllOrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const { currentEvent } = useEvent(); // Use currentEvent from context
    const socket = useSocket();

    const fetchOrders = async (eventId: string) => {
        try {
            const response = await fetchWithLoader(`${API_BASE_URL}/api/orders/event/${eventId}`, { // Use new endpoint
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
        if (currentEvent) {
            fetchOrders(currentEvent._id);
        } else {
            setOrders([]); // Clear orders if no event is selected
        }
    }, [currentEvent]); // Depend on currentEvent

    useEffect(() => {
        if (!socket || !currentEvent) return;

        const handleOrderUpdate = (updatedOrder: Order) => {
            setOrders(prevOrders => {
                // Only update if the order belongs to the current event
                if (updatedOrder.eventId !== currentEvent._id) {
                    return prevOrders;
                }

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
    }, [socket, currentEvent]);

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
            <h1>လက်ရှိအော်ဒါများ {currentEvent ? `(${currentEvent.name})` : ''}</h1>
            {!currentEvent && <p>Please select an event from the Admin menu to view orders.</p>}
            {currentEvent && (
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
            )}

            {currentEvent && collectedOrders.length > 0 && (
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
