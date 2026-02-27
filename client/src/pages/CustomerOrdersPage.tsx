import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { Order, OrderItem } from '../types';
import EditOrderModal from '../components/EditOrderModal';
import { API_BASE_URL } from '../utils/apiConfig';
import './CustomerOrdersPage.css';

const CustomerOrdersPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const socket = useSocket();
    const [orders, setOrders] = useState<Order[]>([]);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const tabId = localStorage.getItem('tabId');

    useEffect(() => {
        const fetchOrders = async () => {
            if (!tabId) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/orders/public/tab/${tabId}`);
                if (!response.ok) throw new Error('Failed to fetch orders');
                const data = await response.json();
                setOrders(data);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (tabId) {
            fetchOrders();
        } else {
            setIsLoading(false);
        }
    }, [tabId]);

    useEffect(() => {
        if (!socket) return;

        const handleOrderUpdate = (updatedOrder: Order) => {
            if (updatedOrder.tabId === tabId) {
                setOrders(prev => {
                    const existing = prev.findIndex(o => o._id === updatedOrder._id);
                    if (existing !== -1) {
                        const next = [...prev];
                        next[existing] = updatedOrder;
                        return next;
                    }
                    return [updatedOrder, ...prev];
                });
            }
        };

        socket.on('order_update', handleOrderUpdate);
        return () => {
            socket.off('order_update', handleOrderUpdate);
        };
    }, [socket, tabId]);

    const handleEditOrder = (orderId: string, data: {
        tableNumber: number;
        customerName?: string;
        items: OrderItem[];
        isPreOrder: boolean;
        isPaid: boolean;
        deliveryAddress?: string;
        tabId?: string;
    }) => {
        return new Promise<void>((resolve, reject) => {
            if (socket) {
                socket.emit('edit_order', { orderId, ...data }, (response: any) => {
                    if (response?.status === 'ok') {
                        resolve();
                    } else {
                        reject(new Error(response?.message || 'Failed to update order'));
                    }
                });
            } else {
                reject(new Error('No connection to server'));
            }
        });
    };

    if (isLoading) {
        return <div className="customer-orders-container"><div className="orders-header"><h1>Loading...</h1></div></div>;
    }

    return (
        <div className="customer-orders-container">
            <Link to={`/menu/${eventId}`} className="back-to-menu">
                ← Back to Menu
            </Link>

            <header className="orders-header">
                <h1>My Orders</h1>
                <p>Track your orders and their status</p>
            </header>

            {orders.length === 0 ? (
                <div className="empty-orders">
                    <div className="empty-icon">📦</div>
                    <p>You haven't placed any orders yet.</p>
                    <Link to={`/menu/${eventId}`} className="edit-order-btn" style={{ marginTop: '1rem' }}>
                        Order Now
                    </Link>
                </div>
            ) : (
                <div className="orders-history-list">
                    {orders.map(order => (
                        <div key={order._id} className="order-history-card">
                            <div className="order-history-header">
                                <span className="order-number">Order #{order.orderNumber}</span>
                                <span className={`order-status-badge status-${order.status.toLowerCase()}`}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="order-history-items">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="history-item">
                                        <span>{item.quantity}x {item.menuItem.name}</span>
                                        <span>¥{(item.menuItem.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                            {order.status === 'New' && (
                                <button
                                    className="edit-order-btn"
                                    onClick={() => setEditingOrder(order)}
                                >
                                    ✏️ Edit Order
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {editingOrder && (
                <EditOrderModal
                    order={editingOrder}
                    onClose={() => setEditingOrder(null)}
                    onSubmit={handleEditOrder}
                />
            )}
        </div>
    );
};

export default CustomerOrdersPage;
