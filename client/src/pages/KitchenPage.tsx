import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useEvent } from '../context/EventContext';
import { Order } from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import OrderCard from '../components/OrderCard';
import './KitchenPage.css';

const KitchenPage = () => {
    const socket = useSocket();
    const { currentEvent } = useEvent();
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        if (!currentEvent) {
            setOrders([]);
            return;
        }

        const fetchOrders = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/orders/event/${currentEvent._id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (!response.ok) throw new Error('Failed to fetch orders');
                const data = await response.json();
                setOrders(data);
            } catch (error) {
                console.error('Error fetching initial kitchen orders:', error);
            }
        };

        fetchOrders();

        if (!socket) return;

        const handleOrderUpdate = (updatedOrder: Order) => {
            setOrders(prevOrders => {
                const existingOrderIndex = prevOrders.findIndex(o => o._id === updatedOrder._id);
                if (existingOrderIndex !== -1) {
                    const newOrders = [...prevOrders];
                    newOrders[existingOrderIndex] = updatedOrder;
                    return newOrders;
                } else {
                    if (updatedOrder.eventId.toString() === currentEvent._id.toString()) {
                        return [...prevOrders, updatedOrder];
                    }
                    return prevOrders;
                }
            });
        };

        socket.on('order_update', handleOrderUpdate);

        return () => {
            socket.off('order_update', handleOrderUpdate);
        };
    }, [socket, currentEvent]);

    const handleStatusUpdate = (orderId: string, status: Order['status']) => {
        if (socket) {
            socket.emit('update_order_status', { orderId, status });
        }
    };

    // Batching Logic: Aggregate items that require prep across New and Preparing orders
    const batchSummary = useMemo(() => {
        const summary: { [key: string]: number } = {};
        orders
            .filter(o => (o.status === 'New' || o.status === 'Preparing') && o.isActive !== false)
            .forEach(order => {
                order.items.forEach(item => {
                    if (item.menuItem.requiresPrep) {
                        summary[item.menuItem.name] = (summary[item.menuItem.name] || 0) + item.quantity;
                    }
                });
            });
        return Object.entries(summary);
    }, [orders]);

    const filterOrdersByStatus = (status: Order['status']) => {
        return orders
            .filter(order => order.status === status && order.isActive !== false)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    };

    return (
        <div className="kds-page">
            <header className="kds-header">
                <h2>Chef's Console {currentEvent ? `(${currentEvent.name})` : ''}</h2>
                <div className="batch-summary-bar">
                    {batchSummary.length > 0 ? (
                        batchSummary.map(([name, qty]) => (
                            <div key={name} className="batch-item">
                                <span className="batch-qty">{qty}</span>
                                <span className="batch-name">{name}</span>
                            </div>
                        ))
                    ) : (
                        <span className="no-batch">No active prep items</span>
                    )}
                </div>
            </header>

            {!currentEvent && <p className="kds-error">Please select an event in the Admin dashboard.</p>}

            <div className="kds-board">
                <section className="kds-lane">
                    <div className="lane-header new">
                        <h3>New Orders</h3>
                        <span className="lane-count">{filterOrdersByStatus('New').length}</span>
                    </div>
                    <div className="lane-content">
                        {filterOrdersByStatus('New').map(order => (
                            <OrderCard key={order._id} order={order} onStatusUpdate={handleStatusUpdate} userRole="Kitchen" />
                        ))}
                    </div>
                </section>

                <section className="kds-lane">
                    <div className="lane-header preparing">
                        <h3>In Progress</h3>
                        <span className="lane-count">{filterOrdersByStatus('Preparing').length}</span>
                    </div>
                    <div className="lane-content">
                        {filterOrdersByStatus('Preparing').map(order => (
                            <OrderCard key={order._id} order={order} onStatusUpdate={handleStatusUpdate} userRole="Kitchen" />
                        ))}
                    </div>
                </section>

                <section className="kds-lane">
                    <div className="lane-header ready">
                        <h3>Ready for Pickup</h3>
                        <span className="lane-count">{filterOrdersByStatus('Ready').length}</span>
                    </div>
                    <div className="lane-content">
                        {filterOrdersByStatus('Ready').map(order => (
                            <OrderCard key={order._id} order={order} onStatusUpdate={handleStatusUpdate} userRole="Kitchen" />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default KitchenPage;
