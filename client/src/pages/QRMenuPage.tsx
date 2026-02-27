import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { MenuItem } from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import toast from 'react-hot-toast';
import './QRMenuPage.css';

const QRMenuPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const socket = useSocket();
    const navigate = useNavigate();

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<{ menuItem: MenuItem; quantity: number }[]>([]);
    const [customerName, setCustomerName] = useState(localStorage.getItem('customerName') || '');
    const [tabId, setTabId] = useState(localStorage.getItem('tabId') || '');
    const [isOrdering, setIsOrdering] = useState(false);
    const [showNameModal, setShowNameModal] = useState(!customerName);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastOrderNumber, setLastOrderNumber] = useState('');

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/menu-items/public/event/${eventId}`);
                if (!response.ok) throw new Error('Failed to fetch menu');
                const data = await response.json();
                setMenuItems(data.filter((item: MenuItem) => !item.isDeleted));
            } catch (error) {
                console.error('Error fetching menu:', error);
            }
        };
        if (eventId) fetchMenu();
    }, [eventId]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(menuItems.map(item => item.category)));
        return cats;
    }, [menuItems]);

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.menuItem._id === item._id);
            if (existing) {
                return prev.map(i => i.menuItem._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { menuItem: item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => {
            const existing = prev.find(i => i.menuItem._id === itemId);
            if (existing && existing.quantity > 1) {
                return prev.map(i => i.menuItem._id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
            }
            return prev.filter(i => i.menuItem._id !== itemId);
        });
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    }, [cart]);

    const handlePlaceOrder = () => {
        if (!customerName.trim()) {
            setShowNameModal(true);
            return;
        }

        if (cart.length === 0) return;

        setIsOrdering(true);
        const orderData = {
            eventId,
            customerName: customerName.trim(),
            tabId: tabId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            items: cart.map(i => ({ menuItem: i.menuItem._id, quantity: i.quantity })),
            isPreOrder: false,
        };

        if (socket) {
            socket.emit('new_public_order', orderData, (response: any) => {
                setIsOrdering(false);
                if (response?.status === 'ok') {
                    if (!tabId) {
                        const newTabId = orderData.tabId;
                        setTabId(newTabId);
                        localStorage.setItem('tabId', newTabId);
                    }
                    localStorage.setItem('customerName', customerName.trim());
                    setLastOrderNumber(response.order.orderNumber);
                    setShowSuccessModal(true);
                    setCart([]);
                } else {
                    toast.error(response?.message || 'Failed to place order.');
                }
            });
        }
    };

    const handleSaveName = (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setCustomerName(trimmed);
        localStorage.setItem('customerName', trimmed);
        setShowNameModal(false);
    };

    return (
        <div className="qr-menu-container">
            <header className="qr-header">
                <h1>Welcome to Connect Kitchen</h1>
                <p>Order your food and pay after eating!</p>
            </header>

            {showNameModal && (
                <div className="name-modal-overlay">
                    <div className="name-modal">
                        <h3>Tell us your name</h3>
                        <p>We use this to identify your order at pickup and checkout.</p>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && customerName.trim()) {
                                    handleSaveName(customerName);
                                }
                            }}
                            autoFocus
                        />
                        <button
                            onClick={() => handleSaveName(customerName)}
                            disabled={!customerName.trim()}
                        >
                            Start Ordering
                        </button>
                    </div>
                </div>
            )}

            <div className="menu-sections">
                {categories.length > 0 ? (
                    categories.map(cat => (
                        <section key={cat} className="menu-category">
                            <h2>{cat}</h2>
                            <div className="menu-items-grid">
                                {menuItems.filter(item => item.category === cat).map(item => (
                                    <div key={item._id} className="menu-item-card">
                                        <div className="item-info">
                                            <h3>{item.name}</h3>
                                            <p className="item-price">¥{item.price}</p>
                                        </div>
                                        <div className="item-actions">
                                            {cart.find(i => i.menuItem._id === item._id) ? (
                                                <div className="qty-controls">
                                                    <button onClick={() => removeFromCart(item._id)}>-</button>
                                                    <span>{cart.find(i => i.menuItem._id === item._id)?.quantity}</span>
                                                    <button onClick={() => addToCart(item)}>+</button>
                                                </div>
                                            ) : (
                                                <button className="add-btn" onClick={() => addToCart(item)}>Add</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))
                ) : (
                    <div className="loading-menu">
                        {eventId ? 'Loading menu items...' : 'No event specified.'}
                    </div>
                )}
            </div>

            {cart.length > 0 && (
                <div className="sticky-cart-bar">
                    <div className="cart-summary">
                        <span>{cart.reduce((s, i) => s + i.quantity, 0)} Items</span>
                        <span className="cart-total">Total: ¥{cartTotal}</span>
                    </div>
                    <button className="place-order-btn" onClick={handlePlaceOrder} disabled={isOrdering}>
                        {isOrdering ? 'Placing Order...' : 'Place Order'}
                    </button>
                </div>
            )}

            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal">
                        <div className="success-icon">
                            <svg viewBox="0 0 24 24">
                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                        </div>
                        <h2>Order Placed!</h2>
                        <p>Your order has been sent to the kitchen.</p>
                        <div className="order-number-display">
                            <span className="label">Order Number</span>
                            <span className="number">{lastOrderNumber}</span>
                        </div>
                        <p className="hint">Please listen for your number on the dashboard.</p>
                        <button className="done-btn" onClick={() => setShowSuccessModal(false)}>Got it!</button>
                    </div>
                </div>
            )}

            <div className="orders-navigation">
                <button className="view-status-btn" onClick={() => navigate(`/status/${eventId}`)}>
                    📺 View Pickup Dashboard
                </button>
                <Link to={`/orders/my/${eventId}`} className="view-my-orders-btn">
                    🛍️ View My Orders
                </Link>
            </div>
        </div>
    );
};

export default QRMenuPage;
