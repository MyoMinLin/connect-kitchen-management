import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../hooks/useSocket';
import { Order } from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './PublicStatusPage.css';

const PublicStatusPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const location = useLocation();
    const socket = useSocket();
    const [orders, setOrders] = useState<Order[]>([]);
    const [lastReadyOrder, setLastReadyOrder] = useState<string | null>(null);
    const { t } = useTranslation();

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <h1>🍳 {isFiltered ? t('publicStatus.myOrderStatus') : t('publicStatus.orderStatus')}</h1>
                <LanguageSwitcher />
                {isFiltered && (
                    <Link to={`/status/${eventId}?view=all`} className="view-all-link">
                        {t('publicStatus.viewAllOrders')}
                    </Link>
                )}
                {!isFiltered && customerTabId && (
                    <Link to={`/status/${eventId}`} className="view-all-link">
                        {t('publicStatus.viewMyOrders')}
                    </Link>
                )}
                {lastReadyOrder && (
                    <div className="announcement-banner">
                        🔔 {t('publicStatus.orderReady', { name: lastReadyOrder })}
                    </div>
                )}
            </header>

            <main className="status-grid">
                <section className="status-column preparing">
                    <h2>{t('publicStatus.currentlyCooking')}</h2>
                    <div className="name-list">
                        {preparingOrders.length > 0 ? (
                            preparingOrders.map(order => (
                                <div key={order._id} className="name-card">
                                    <span className="order-name">{order.seatNumber ? `${t('common.seat')} ${order.seatNumber}` : (order.customerName || `#${order.orderNumber}`)}</span>
                                    <span className="prep-indicator">{t('publicStatus.preparing')}</span>
                                </div>
                            ))
                        ) : (
                            <p className="empty-msg">{t('publicStatus.waitingForOrders')}</p>
                        )}
                    </div>
                </section>

                <section className="status-column ready">
                    <h2>{t('publicStatus.readyToCollect')}</h2>
                    <div className="name-list">
                        {readyOrders.length > 0 ? (
                            readyOrders.map(order => {
                                const displayName = order.seatNumber ? `${t('common.seat')} ${order.seatNumber}` : (order.customerName || `#${order.orderNumber}`);
                                return (
                                    <div key={order._id} className={`name-card ready-card ${lastReadyOrder === displayName ? 'highlight' : ''}`}>
                                        <span className="order-name">{displayName}</span>
                                        <span className="ready-indicator">{t('publicStatus.readyIndicator')}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="empty-msg">{t('publicStatus.freshFood')}</p>
                        )}
                    </div>
                </section>
            </main>

            <footer className="status-footer">
                <p>{t('publicStatus.footerMessage')}</p>
            </footer>
        </div>
    );
};

export default PublicStatusPage;
