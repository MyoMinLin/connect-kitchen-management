import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Order } from './WaitstaffPage'; // Re-using the interface
import OrderCard from '../components/OrderCard';
import './KitchenPage.css';

const KitchenPage = () => {
    const socket = useSocket();
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        if (!socket) return;

        const handleInitialOrders = (initialOrders: Order[]) => {
            setOrders(initialOrders);
        };

        const handleOrderUpdate = (updatedOrder: Order) => {
            setOrders(prevOrders => {
                const existingOrderIndex = prevOrders.findIndex(o => o._id === updatedOrder._id);
                if (existingOrderIndex !== -1) {
                    // Update existing order
                    const newOrders = [...prevOrders];
                    newOrders[existingOrderIndex] = updatedOrder;
                    return newOrders;
                } else {
                    // Add new order
                    return [...prevOrders, updatedOrder];
                }
            });
        };

        socket.on('initial_orders', handleInitialOrders);
        socket.on('order_update', handleOrderUpdate);

        return () => {
            socket.off('initial_orders', handleInitialOrders);
            socket.off('order_update', handleOrderUpdate);
        };
    }, [socket]);

    const handleStatusUpdate = (orderId: string, status: Order['status']) => {
        if (socket) {
            socket.emit('update_order_status', { orderId, status });
        }
    };

    const filterOrdersByStatus = (status: Order['status']) => {
        return orders
            .filter(order => order.status === status)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    };

    return (
        <div>
            <h2>Kitchen Display System</h2>
            <div className="kds-container">
                <div className="kds-column">
                    <h3>New</h3>
                    {filterOrdersByStatus('New').map(order => (
                        <OrderCard key={order._id} order={order} onStatusUpdate={handleStatusUpdate} userRole="Kitchen" />
                    ))}
                </div>
                <div className="kds-column">
                    <h3>Preparing</h3>
                    {filterOrdersByStatus('Preparing').map(order => (
                        <OrderCard key={order._id} order={order} onStatusUpdate={handleStatusUpdate} userRole="Kitchen" />
                    ))}
                </div>
                <div className="kds-column">
                    <h3>Ready</h3>
                    {filterOrdersByStatus('Ready').map(order => (
                        <OrderCard key={order._id} order={order} onStatusUpdate={handleStatusUpdate} userRole="Kitchen" />
                    ))}
                </div>
                <div className="kds-column">
                    <h3>Collected</h3>
                    {filterOrdersByStatus('Collected').length > 0 ? (
                        filterOrdersByStatus('Collected').map(order => (
                            <OrderCard key={order._id} order={order} onStatusUpdate={handleStatusUpdate} userRole="Kitchen" />
                        ))
                    ) : (
                        <p>No collected orders yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KitchenPage;
