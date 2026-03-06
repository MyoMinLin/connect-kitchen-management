import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { MenuItem } from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import toast from 'react-hot-toast';
import ItemDetailModal from '../components/ItemDetailModal';
import EditOrderModal from '../components/EditOrderModal';
import './QRMenuPage.css';

const QRMenuPage: React.FC = () => {
    const { eventId, seat } = useParams<{ eventId: string; seat?: string }>();
    const socket = useSocket();
    const navigate = useNavigate();

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<{ menuItem: MenuItem; quantity: number; selectedOptions?: { [key: string]: string } }[]>([]);
    const [customerName, setCustomerName] = useState(localStorage.getItem('customerName') || '');
    const [tabId, setTabId] = useState(localStorage.getItem('tabId') || '');
    const [isOrdering, setIsOrdering] = useState(false);

    // New states for UI
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');
    const [orders, setOrders] = useState<any[]>([]); // Changed to any for now to avoid complexity, usually Order[]
    const [editingOrder, setEditingOrder] = useState<any | null>(null);

    const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Effective seat: use URL param first, fallback to localStorage
    const effectiveSeat = seat || localStorage.getItem('currentSeat') || '';

    const [showNameModal, setShowNameModal] = useState(!customerName && !effectiveSeat);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastOrderNumber, setLastOrderNumber] = useState('');

    // Persistence Effect
    useEffect(() => {
        if (seat) {
            localStorage.setItem('currentSeat', seat);
        }
    }, [seat]);

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`${API_BASE_URL}/api/menu-items/public/event/${eventId}`);
                const data = await res.json();
                if (data.message) throw new Error(data.message);
                const filtered = data.filter((item: MenuItem) => !item.isDeleted);
                setMenuItems(filtered);
                if (filtered.length > 0 && !activeCategory) {
                    setActiveCategory(filtered[0].category);
                }
            } catch (err) {
                console.error('Failed to fetch menu:', err);
                toast.error('Failed to load menu items');
            } finally {
                setIsLoading(false);
            }
        };
        if (eventId) fetchMenu();
    }, [eventId]);

    // Fetch orders for history tab
    useEffect(() => {
        const fetchOrders = async () => {
            if (!tabId || activeTab !== 'history') return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/orders/public/tab/${tabId}`);
                if (!response.ok) throw new Error('Failed to fetch orders');
                const data = await response.json();
                setOrders(data);
            } catch (error) {
                console.error('Error fetching orders:', error);
            }
        };

        fetchOrders();
    }, [tabId, activeTab]);

    useEffect(() => {
        if (!socket || !tabId) return;

        const handleOrderUpdate = (updatedOrder: any) => {
            if (updatedOrder.tabId === tabId) {
                setOrders(prev => {
                    const existing = prev.findIndex((o: any) => o._id === updatedOrder._id);
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
        return () => { socket.off('order_update'); };
    }, [socket, tabId]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(menuItems.map(item => item.category)));
        return cats;
    }, [menuItems]);

    const addToCart = (item: MenuItem, quantity: number = 1, selectedOptions?: { [key: string]: string }) => {
        setCart(prev => {
            const existingIndex = prev.findIndex(i =>
                i.menuItem._id === item._id &&
                JSON.stringify(i.selectedOptions) === JSON.stringify(selectedOptions)
            );

            if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + quantity };
                return updated;
            }
            return [...prev, { menuItem: item, quantity, selectedOptions }];
        });
        toast.success(`${item.name} added to cart!`);
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    }, [cart]);

    const handlePlaceOrder = () => {
        if (!effectiveSeat && !customerName.trim()) {
            setShowNameModal(true);
            return;
        }

        if (cart.length === 0) return;

        setIsOrdering(true);
        const orderData = {
            eventId,
            customerName: customerName.trim() || undefined,
            seatNumber: effectiveSeat,
            tabId: tabId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            items: cart.map(i => ({
                menuItem: i.menuItem._id,
                quantity: i.quantity,
                remarks: i.selectedOptions ? Object.entries(i.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : ''
            })),
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
                    toast.error(response?.message || 'Failed to send order.');
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

    const handleEditOrder = (orderId: string, data: any) => {
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

    const scrollToCategory = (cat: string) => {
        setActiveCategory(cat);
        const element = categoryRefs.current[cat];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (isLoading) {
        return (
            <div className="qr-loading">
                <div className="qr-spinner"></div>
                <p>Loading menu items...</p>
            </div>
        );
    }

    return (
        <div className="qr-menu-container">
            <header className="qr-header-v2">
                <div className="header-top">
                    <div className="qr-logo">
                        <svg viewBox="0 0 24 24" width="32" height="32">
                            <path fill="currentColor" d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2v-2zm0 4h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0-4h2v2h-2v-2zm2 2h2v2h-2v-2z" />
                        </svg>
                    </div>
                    <div className="header-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'order' ? 'active' : ''}`}
                            onClick={() => setActiveTab('order')}
                        >
                            Order
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            Order History
                        </button>
                    </div>
                </div>

                {!effectiveSeat && (
                    <div className="search-name-bar">
                        <input
                            type="text"
                            placeholder="Please enter your name."
                            value={customerName}
                            onChange={(e) => {
                                setCustomerName(e.target.value);
                                localStorage.setItem('customerName', e.target.value);
                            }}
                            className="name-input-field"
                        />
                    </div>
                )}

                {effectiveSeat && (
                    <div className="seat-info-fixed">💺 Seat {effectiveSeat}</div>
                )}
            </header>

            <div className="main-content-layout">
                {activeTab === 'order' ? (
                    <>
                        <aside className="sidebar-categories">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`side-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                                    onClick={() => scrollToCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </aside>

                        <main className="menu-items-scroll">
                            {categories.map(cat => (
                                <section
                                    key={cat}
                                    className="menu-category-v2"
                                    ref={el => { if (el) categoryRefs.current[cat] = el as HTMLDivElement; }}
                                >
                                    <h2 className="cat-title">{cat}</h2>
                                    <div className="items-list-v2">
                                        {menuItems.filter(item => item.category === cat).map(item => (
                                            <div
                                                key={item._id}
                                                className="item-card-v2"
                                                onClick={() => setSelectedItem(item)}
                                            >
                                                <div className="item-img-wrap">
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt={item.name} />
                                                    ) : (
                                                        <div className="img-placeholder">🍽️</div>
                                                    )}
                                                </div>
                                                <div className="item-content-v2">
                                                    <h3 className="item-name-v2">{item.name}</h3>
                                                    <div className="item-footer-v2">
                                                        <span className="item-price-v2">¥{item.price.toLocaleString()}</span>
                                                        <button className="add-plus-btn">+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </main>
                    </>
                ) : (
                    <div className="menu-items-scroll">
                        <div className="orders-history-list-embedded">
                            <h3 className="cat-title">My Orders</h3>
                            {orders.length === 0 ? (
                                <div className="empty-orders-embedded">
                                    <div className="empty-icon">📦</div>
                                    <p>You haven't placed any orders yet.</p>
                                </div>
                            ) : (
                                orders.map((order: any) => (
                                    <div key={order._id} className="order-history-card-v2">
                                        <div className="order-history-header">
                                            <span className="order-number">Order #{order.orderNumber}</span>
                                            <span className={`order-status-badge status-${order.status.toLowerCase()}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="order-history-items">
                                            {order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="history-item">
                                                    <span>{item.quantity}x {item.menuItem.name}</span>
                                                    <span>¥{(item.menuItem.price * item.quantity).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {order.status === 'New' && (
                                            <button
                                                className="idm-add-btn"
                                                style={{ marginTop: '10px', width: '100%', padding: '8px' }}
                                                onClick={() => setEditingOrder(order)}
                                            >
                                                ✏️ Edit Order
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {cart.length > 0 && (
                <div className="cart-footer-v2">
                    <div className="cart-stats">
                        Total items in cart: {cart.reduce((s, i) => s + i.quantity, 0)} {/* Changed string */}
                    </div>
                    <button className="order-confirm-btn" onClick={handlePlaceOrder} disabled={isOrdering}>
                        {isOrdering ? 'Ordering...' : 'Confirm Order'} {/* Changed string */}
                    </button>
                </div>
            )}

            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onAddToCart={addToCart}
                />
            )}

            {showNameModal && !effectiveSeat && (
                <div className="name-modal-overlay">
                    <div className="name-modal">
                        <h3>Your Name</h3> {/* Changed string */}
                        <p>Please enter your name to identify your order.</p> {/* Changed string */}
                        <input
                            type="text"
                            placeholder="Name" // Changed string
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && customerName.trim()) {
                                    handleSaveName(customerName);
                                    setShowNameModal(false);
                                }
                            }}
                            autoFocus
                        />
                        <button
                            onClick={() => {
                                handleSaveName(customerName);
                                setShowNameModal(false);
                            }}
                            disabled={!customerName.trim()}
                        >
                            Start Ordering {/* Changed string */}
                        </button>
                    </div>
                </div>
            )}

            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal">
                        <div className="success-icon">✅</div>
                        <h2>Order Complete!</h2> {/* Changed string */}
                        <p>Your order has reached the kitchen.</p> {/* Changed string */}
                        <div className="order-num-box">
                            <span>Order Number</span> {/* Changed string */}
                            <strong>{lastOrderNumber}</strong>
                        </div>
                        <button className="done-btn" onClick={() => setShowSuccessModal(false)}>Close</button> {/* Changed string */}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRMenuPage;
