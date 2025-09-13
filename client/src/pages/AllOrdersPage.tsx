
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { useSocket } from '../hooks/useSocket';
import { API_BASE_URL } from '../utils/apiConfig';
import './AllOrdersPage.css';
import { format } from 'date-fns';

const AllOrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const { user } = useAuth();
    const socket = useSocket();

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // TODO: Fetch orders for the current event
            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

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
    }, [socket]);

    const handleMarkAsCollected = (orderId: string) => {
        if (socket) {
            socket.emit('update_order_status', { orderId, status: 'Collected' });
        }
    };

    const activeOrders = orders.filter(order => order.status !== 'Collected');
    const collectedOrders = orders.filter(order => order.status === 'Collected');

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="all-orders-page">
            <h1>လက်ရှိအော်ဒါများ</h1>
            <div className="orders-list-container">
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>Order Number</th>
                            <th>Customer</th>
                            <th>Item</th>
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
                                <td data-label="Customer">{order.customerName || '-'}</td>
                                <td data-label="Item">
                                    <ul>
                                        {order.items.map((item, index) => (
                                            <li key={index}>
                                                {item.quantity}x {item.menuItem.name}
                                                {item.remarks && <span className="item-remarks"> ({item.remarks})</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </td>
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
                                    <th>Customer</th>
                                    <th>Item</th>
                                    <th>Ordered At</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collectedOrders.map(order => (
                                    <tr key={order._id} className={`status-${order.status.toLowerCase()}`}>
                                        <td data-label="Table">
                                            {order.isPreOrder && <span className="pre-order-indicator">Pre</span>}
                                            {order.tableNumber}
                                        </td>
                                        <td data-label="Customer">{order.customerName || '-'}</td>
                                        <td data-label="Item">
                                            <ul>
                                                {order.items.map((item, index) => (
                                                    <li key={index}>
                                                        {item.quantity}x {item.menuItem.name}
                                                        {item.remarks && <span className="item-remarks"> ({item.remarks})</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
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
