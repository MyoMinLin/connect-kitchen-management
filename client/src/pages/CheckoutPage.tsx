import React, { useState, useEffect, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useEvent } from '../context/EventContext';
import { Order } from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import { fetchWithLoader } from '../utils/api';
import './CheckoutPage.css';

const CheckoutPage: React.FC = () => {
    const { currentEvent } = useEvent();
    const socket = useSocket();
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

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
            const name = order.customerName || 'Walk-in / Unknown';
            if (!tabGroups[name]) tabGroups[name] = [];
            tabGroups[name].push(order);
        });

        return Object.entries(tabGroups).map(([name, orders]) => {
            const total = orders.reduce((sum, o) => {
                return sum + o.items.reduce((itemSum, i) => itemSum + (i.menuItem.price * i.quantity), 0);
            }, 0);
            return { name, orders, total };
        }).filter(tab => tab.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [orders, searchTerm]);

    const handleSettleTab = async (customerName: string) => {
        if (!window.confirm(`Settle all orders for ${customerName}?`)) return;

        try {
            const response = await fetchWithLoader(`${API_BASE_URL}/api/orders/tab/settle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    eventId: currentEvent?._id,
                    customerName: customerName === 'Walk-in / Unknown' ? undefined : customerName
                })
            });

            if (response.ok) {
                alert('Tab settled successfully!');
                fetchOrders(); // Refresh local data
            } else {
                alert('Failed to settle tab.');
            }
        } catch (error) {
            console.error('Error settling tab:', error);
        }
    };

    return (
        <div className="checkout-container">
            <header className="checkout-header">
                <h2>Checkout & Tab Settlement</h2>
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search by Customer Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {!currentEvent && <p>Please select an event in admin settings.</p>}

            <div className="tabs-grid">
                {tabs.length > 0 ? (
                    tabs.map(tab => (
                        <div key={tab.name} className="tab-card">
                            <div className="tab-top">
                                <h3>{tab.name}</h3>
                                <span className="order-count">{tab.orders.length} Order(s)</span>
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
                                    <span>Total:</span>
                                    <strong>¥{tab.total}</strong>
                                </div>
                                <button className="settle-btn" onClick={() => handleSettleTab(tab.name)}>
                                    Pay & Close Tab
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="no-tabs">No active tabs found.</p>
                )}
            </div>
        </div>
    );
};

export default CheckoutPage;
