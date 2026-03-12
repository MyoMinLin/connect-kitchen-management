import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { MenuItem, Order } from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import toast from 'react-hot-toast';
import ItemDetailModal from '../components/ItemDetailModal';
import { useLoader } from '../context/LoaderContext';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import CategorySidebar from '../components/qr/CategorySidebar';
import MenuSection from '../components/qr/MenuSection';
import CartSummary from '../components/qr/CartSummary';
import OrderHistoryList from '../components/qr/OrderHistoryList';
import IdentityModal from '../components/qr/IdentityModal';
import { QRIcon } from '../components/icons/QRIcon';
import './CustomerOrderPage.css';

interface SocketResponse {
    status: 'ok' | 'error';
    message?: string;
    order?: Order;
}

const CustomerOrderPage: React.FC = () => {
    const { eventId: paramEventId, seat: encryptedSeat } = useParams<{ eventId?: string; seat?: string }>();
    const socket = useSocket();

    const [eventId, setEventId] = useState<string | undefined>(paramEventId);

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<{ menuItem: MenuItem; quantity: number; selectedOptions?: { [key: string]: string }; remarks?: string }[]>([]);
    const [customerName, setCustomerName] = useLocalStorageState<string>('customerName', '');
    const [tabId, setTabId] = useLocalStorageState<string>('tabId', '');
    const [isOrdering, setIsOrdering] = useState(false);

    // New states for UI
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const { showLoader, hideLoader } = useLoader();
    const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');
    const [orders, setOrders] = useState<Order[]>([]);

    const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Effective seat: decrypt from param first, fallback to localStorage
    const decryptedSeat = useMemo(() => {
        if (!encryptedSeat) return '';
        try {
            return atob(encryptedSeat);
        } catch {
            return encryptedSeat; // Fallback if not base64
        }
    }, [encryptedSeat]);

    const [currentSeat, setCurrentSeat] = useLocalStorageState<string>('currentSeat', '');
    const effectiveSeat = decryptedSeat || currentSeat || '';

    const [showNameModal, setShowNameModal] = useState(!customerName && !effectiveSeat);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastOrderNumber, setLastOrderNumber] = useState('');

    // Persistence Effect for seat
    useEffect(() => {
        if (effectiveSeat && effectiveSeat !== currentSeat) {
            setCurrentSeat(effectiveSeat);
        }
    }, [effectiveSeat, currentSeat, setCurrentSeat]);

    useEffect(() => {
        const fetchEventAndMenu = async () => {
            try {
                showLoader();
                let currentEventId = eventId;

                // Discover active event if not provided in URL
                if (!currentEventId) {
                    const activeRes = await fetch(`${API_BASE_URL}/api/events/public/active`);
                    if (activeRes.ok) {
                        const activeData = await activeRes.json();
                        currentEventId = activeData._id;
                        setEventId(currentEventId);
                    } else {
                        throw new Error('No active event found.');
                    }
                }

                if (!currentEventId) return;

                const res = await fetch(`${API_BASE_URL}/api/menu-items/public/event/${currentEventId}`);
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
                hideLoader();
            }
        };
        fetchEventAndMenu();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

        const handleOrderUpdate = (updatedOrder: Order) => {
            if (updatedOrder.tabId === tabId) {
                setOrders(prev => {
                    const existing = prev.findIndex((o) => o._id === updatedOrder._id);
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

    // Deep equality for selected options
    const areOptionsEqual = (opt1?: { [key: string]: string }, opt2?: { [key: string]: string }) => {
        if (!opt1 && !opt2) return true;
        if (!opt1 || !opt2) return false;
        const keys1 = Object.keys(opt1);
        const keys2 = Object.keys(opt2);
        if (keys1.length !== keys2.length) return false;
        return keys1.every(key => opt1[key] === opt2[key]);
    };

    const addToCart = (item: MenuItem, quantity: number = 1, selectedOptions?: { [key: string]: string }, remarks?: string) => {
        setCart(prev => {
            const existingIndex = prev.findIndex(i =>
                i.menuItem._id === item._id &&
                areOptionsEqual(i.selectedOptions, selectedOptions) &&
                i.remarks === remarks
            );

            if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + quantity };
                return updated;
            }
            return [...prev, { menuItem: item, quantity, selectedOptions, remarks }];
        });
        toast.success(`${item.name} added to cart!`);
    };

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
            items: cart.map(i => {
                const optionRemarks = i.selectedOptions ? Object.entries(i.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
                const userRemarks = i.remarks || '';
                const combinedRemarks = [optionRemarks, userRemarks].filter(Boolean).join(' | ');

                return {
                    menuItem: i.menuItem._id,
                    quantity: i.quantity,
                    remarks: combinedRemarks
                };
            }),
            isPreOrder: false,
        };

        if (socket) {
            socket.emit('new_public_order', orderData, (response: SocketResponse) => {
                setIsOrdering(false);
                if (response?.status === 'ok') {
                    if (!tabId) {
                        setTabId(orderData.tabId);
                    }
                    if (response.order) {
                        setLastOrderNumber(response.order.orderNumber);
                    }
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
        setShowNameModal(false);
    };

    const scrollToCategory = (cat: string) => {
        setActiveCategory(cat);
        const element = categoryRefs.current[cat];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="qr-menu-container">
            <header className="qr-header-v2">
                <div className="header-top">
                    <div className="qr-logo">
                        <QRIcon />
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
                            onChange={(e) => setCustomerName(e.target.value)}
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
                        <CategorySidebar
                            categories={categories}
                            activeCategory={activeCategory}
                            onCategoryClick={scrollToCategory}
                        />

                        <MenuSection
                            categories={categories}
                            menuItems={menuItems}
                            categoryRefs={categoryRefs}
                            onItemClick={setSelectedItem}
                        />
                    </>
                ) : (
                    <div className="menu-items-scroll">
                        <OrderHistoryList orders={orders} />
                    </div>
                )}
            </div>

            <CartSummary
                cart={cart}
                onPlaceOrder={handlePlaceOrder}
                isOrdering={isOrdering}
            />

            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onAddToCart={addToCart}
                />
            )}

            {showNameModal && !effectiveSeat && (
                <IdentityModal
                    customerName={customerName}
                    setCustomerName={setCustomerName}
                    onSaveName={handleSaveName}
                />
            )}

            {showSuccessModal && (
                <div className="success-modal-overlay">
                    <div className="success-modal">
                        <div className="success-icon">✅</div>
                        <h2>Order Complete!</h2>
                        <p>Your order has reached the kitchen.</p>
                        <div className="order-num-box">
                            <span>Order Number</span>
                            <strong>{lastOrderNumber}</strong>
                        </div>
                        <button className="done-btn" onClick={() => setShowSuccessModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerOrderPage;
