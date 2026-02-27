import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { Order } from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import './PublicStatusPage.css';

const PublicStatusPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const location = useLocation();
    const socket = useSocket();
    const [orders, setOrders] = useState<Order[]>([]);
    const [lastReadyOrder, setLastReadyOrder] = useState<string | null>(null);

    const queryParams = new URLSearchParams(location.search);
    const viewAll = queryParams.get('view') === 'all';
    const customerTabId = localStorage.getItem('tabId');

    const fetchStatus = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/public/status/${eventId}`);
            if (!response.ok) throw new Error('Failed to fetch status');
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error('Error fetching public status:', error);
        }
    };

    useEffect(() => {
        if (eventId) {
            fetchStatus();
        }
    }, [eventId]);

    useEffect(() => {
        if (!socket || !eventId) return;

        const handleOrderUpdate = (updatedOrder: Order) => {
            if (updatedOrder.eventId !== eventId) return;

            setOrders(prevOrders => {
                const filtered = prevOrders.filter(o => o._id !== updatedOrder._id);
                // Only keep Preparing and Ready orders for the public view
                if (updatedOrder.status === 'Preparing' || updatedOrder.status === 'Ready') {
                    if (updatedOrder.status === 'Ready') {
                        setLastReadyOrder(updatedOrder.customerName || updatedOrder.orderNumber);
                        // Clear the highlight after 10 seconds
                        setTimeout(() => setLastReadyOrder(null), 10000);
                    }
                    return [...filtered, updatedOrder];
                }
                return filtered;
            });
        };

        socket.on('order_update', handleOrderUpdate);
        return () => {
            socket.off('order_update', handleOrderUpdate);
        };
    }, [socket, eventId]);

    const displayedOrders = useMemo(() => {
        if (viewAll || !customerTabId) return orders;
        return orders.filter(o => o.tabId === customerTabId);
    }, [orders, viewAll, customerTabId]);

    const preparingOrders = displayedOrders.filter(o => o.status === 'Preparing');
    const readyOrders = displayedOrders.filter(o => o.status === 'Ready');

    const isFiltered = !viewAll && !!customerTabId;

    return (
        <div className="public-status-container">
            <header className="status-header">
                <h1>🍳 {isFiltered ? 'My Order Status' : 'Connect Kitchen Order Status'}</h1>
                {isFiltered && (
                    <Link to={`/status/${eventId}?view=all`} className="view-all-link">
                        View All Orders
                    </Link>
                )}
                {!isFiltered && customerTabId && (
                    <Link to={`/status/${eventId}`} className="view-all-link">
                        View My Orders Only
                    </Link>
                )}
                {lastReadyOrder && (
                    <div className="announcement-banner">
                        🔔 {lastReadyOrder} - Your order is READY!
                    </div>
                )}
            </header>

            <main className="status-grid">
                <section className="status-column preparing">
                    <h2>Currently Cooking</h2>
                    <div className="name-list">
                        {preparingOrders.length > 0 ? (
                            preparingOrders.map(order => (
                                <div key={order._id} className="name-card">
                                    <span className="order-name">{order.customerName || order.orderNumber}</span>
                                    <span className="prep-indicator">Preparing...</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-msg">Waiting for more orders...</p>
                        )}
                    </div>
                </section>

                <section className="status-column ready">
                    <h2>Ready to Collect</h2>
                    <div className="name-list">
                        {readyOrders.length > 0 ? (
                            readyOrders.map(order => (
                                <div key={order._id} className={`name-card ready-card ${lastReadyOrder === (order.customerName || order.orderNumber) ? 'highlight' : ''}`}>
                                    <span className="order-name">{order.customerName || order.orderNumber}</span>
                                    <span className="ready-indicator">READY ✅</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-msg">Fresh food on the way!</p>
                        )}
                    </div>
                </section>
            </main>

            <footer className="status-footer">
                <p>Please come to the counter when your name appears in the Ready list.</p>
            </footer>
        </div>
    );
};

export default PublicStatusPage;
