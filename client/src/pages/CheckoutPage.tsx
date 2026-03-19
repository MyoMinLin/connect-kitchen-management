import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useEvent } from '../context/EventContext';
import { Order } from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import { fetchWithLoader } from '../utils/api';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import './CheckoutPage.css';

const CheckoutPage: React.FC = () => {
    const { currentEvent } = useEvent();
    const socket = useSocket();
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { t } = useTranslation();

    const fetchOrders = async () => {
        if (!currentEvent) return;
        try {
            const response = await fetchWithLoader(`${API_BASE_URL}/api/orders/event/${currentEvent._id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Failed to fetch orders');
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error('Error fetching orders for checkout:', error);
        }
    };

    useEffect(() => {
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentEvent]);

    useEffect(() => {
        if (!socket || !currentEvent) return;
        const handleOrderUpdate = (updatedOrder: Order) => {
            if (updatedOrder.eventId !== currentEvent._id) return;
            setOrders(prev => {
                const filtered = prev.filter(o => o._id !== updatedOrder._id);
                return [updatedOrder, ...filtered];
            });
        };
        socket.on('order_update', handleOrderUpdate);
        return () => {
            socket.off('order_update', handleOrderUpdate);
        };
    }, [socket, currentEvent]);

    const tabs = useMemo(() => {
        const activeOrders = orders.filter(o => o.status !== 'Collected' && o.status !== 'Cancelled' && o.isActive !== false);
        const tabGroups: { [key: string]: Order[] } = {};

        activeOrders.forEach(order => {
            const identifier = order.seatNumber ? `${t('common.seat')} ${order.seatNumber}` : (order.customerName || 'Walk-in / Unknown');
            if (!tabGroups[identifier]) tabGroups[identifier] = [];
            tabGroups[identifier].push(order);
        });

        return Object.entries(tabGroups).map(([identifier, orders]) => {
            const total = orders.reduce((sum, o) => {
                return sum + o.items.reduce((itemSum, i) => itemSum + (i.menuItem.price * i.quantity), 0);
            }, 0);
            return { identifier, orders, total };
        }).filter(tab => tab.identifier.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [orders, searchTerm, t]);

    const handleSettleTab = async (identifier: string) => {
        if (!window.confirm(t('checkout.settleConfirm', { identifier }))) return;

        try {
            // Clean up identifier (remove translated 'Seat ' prefix if present)
            const seatPrefix = `${t('common.seat')} `;
            const cleanIdentifier = identifier.startsWith(seatPrefix) ? identifier.replace(seatPrefix, '') : identifier;

            const response = await fetchWithLoader(`${API_BASE_URL}/api/orders/tab/settle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    eventId: currentEvent?._id,
                    identifier: cleanIdentifier === 'Walk-in / Unknown' ? undefined : cleanIdentifier
                })
            });

            if (response.ok) {
                toast.success(t('checkout.settleSuccess'));
                fetchOrders(); // Refresh local data
            } else {
                toast.error(t('checkout.settleFailed'));
            }
        } catch (error) {
            console.error('Error settling tab:', error);
        }
    };

    return (
        <div className="checkout-container">
            <header className="checkout-header">
                <h2>{t('checkout.title')}</h2>
                <div className="search-box">
                    <input
                        type="text"
                        placeholder={t('checkout.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {!currentEvent && <p>{t('checkout.selectEventPrompt')}</p>}

            <div className="tabs-grid">
                {tabs.length > 0 ? (
                    tabs.map(tab => (
                        <div key={tab.identifier} className="tab-card">
                            <div className="tab-top">
                                <h3>{tab.identifier}</h3>
                                <span className="order-count">{t('checkout.orderCount', { count: tab.orders.length })}</span>
                            </div>
                            <div className="tab-details">
                                {tab.orders.map(o => (
                                    <div key={o._id} className="tab-row">
                                        <span>#{o.orderNumber.slice(-3)}</span>
                                        <div className="tab-items">
                                            {o.items.map((i, idx) => (
                                                <span key={idx}>{i.quantity}x {i.menuItem.name}</span>
                                            ))}
                                        </div>
                                        <span className={`status-dot ${o.status.toLowerCase()}`} title={o.status}></span>
                                    </div>
                                ))}
                            </div>
                            <div className="tab-footer">
                                <div className="total-amount">
                                    <span>{t('common.total')}:</span>
                                    <strong>¥{tab.total}</strong>
                                </div>
                                <button className="settle-btn" onClick={() => handleSettleTab(tab.identifier)}>
                                    {t('checkout.payAndClose')}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="no-tabs">{t('checkout.noActiveTabs')}</p>
                )}
            </div>
        </div>
    );
};

export default CheckoutPage;
