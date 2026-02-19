import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuItem, OrderItem } from '../types'; // Import from types.ts
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext'; // Import useEvent
import { API_BASE_URL } from '../utils/apiConfig';
import { fetchWithLoader } from '../utils/api';
import './OrderForm.css';

interface OrderFormProps {
    onSubmit: (order: { eventId: string; tableNumber: number; customerName?: string; items: OrderItem[]; isPreOrder: boolean; isPaid: boolean; deliveryAddress?: string; }) => Promise<void>;
}

const OrderForm: React.FC<OrderFormProps> = ({ onSubmit }) => {
    const { token, logout } = useAuth();
    const { currentEvent } = useEvent();
    const navigate = useNavigate();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [tableNumber, setTableNumber] = useState<number | ''>('');
    const [customerName, setCustomerName] = useState<string>('');
    const [isPreOrder, setIsPreOrder] = useState<boolean>(false);
    const [isPaid, setIsPaid] = useState<boolean>(false);
    const [deliveryAddress, setDeliveryAddress] = useState<string>('');
    const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
    const [menuSearch, setMenuSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'details' | 'menu'>('details');

    // Effect to fetch menu items for the current event
    useEffect(() => {
        if (token && currentEvent) {
            fetchWithLoader(`${API_BASE_URL}/api/menu-items/event/${currentEvent._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => {
                    if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
                    return res.json();
                })
                .then(data => {
                    if (data.message) throw new Error(data.message);
                    setMenuItems(data);
                })
                .catch(err => console.error("Failed to fetch menu items:", err));
        } else if (token && !currentEvent) {
            setMenuItems([]);
        }
    }, [token, logout, currentEvent]);

    const handleAddItem = (menuItemId: string) => {
        setCurrentOrderItems(prev => {
            const existingIndex = prev.findIndex(i => i.menuItem === menuItemId);
            if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
                return updated;
            }
            return [...prev, { menuItem: menuItemId, quantity: 1, remarks: '' }];
        });
        // On mobile, switch to details tab to see the item was added
        if (window.innerWidth < 768) setActiveTab('details');
    };

    const handleRemoveItem = (index: number) => {
        setCurrentOrderItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleQuantityChange = (index: number, qty: number) => {
        if (qty < 1) {
            handleRemoveItem(index);
            return;
        }
        setCurrentOrderItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
    };

    const handleRemarkChange = (index: number, remark: string) => {
        setCurrentOrderItems(prev => prev.map((item, i) => i === index ? { ...item, remarks: remark } : item));
    };

    const getMenuItem = (menuItemId: string): MenuItem | undefined => {
        return menuItems.find(mi => mi._id === menuItemId);
    };

    const calculateTotal = () => {
        return currentOrderItems.reduce((total, item) => {
            const mi = getMenuItem(item.menuItem);
            return mi ? total + (mi.price * item.quantity) : total;
        }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentEvent) {
            alert('No active event selected. Cannot create order.');
            return;
        }
        if (currentOrderItems.length === 0) {
            alert('Please add items to the order.');
            return;
        }

        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            await onSubmit({
                eventId: currentEvent._id,
                tableNumber: tableNumber as number,
                customerName,
                items: currentOrderItems,
                isPreOrder,
                isPaid,
                deliveryAddress
            });

            // Reset form
            setCurrentOrderItems([]);
            setTableNumber('');
            setCustomerName('');
            setIsPreOrder(false);
            setIsPaid(false);
            setDeliveryAddress('');
            navigate('/orders');
        } catch (error) {
            console.error('Error submitting order:', error);
            alert('Failed to submit order. Please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredMenuItems = menuItems.filter(mi =>
        mi.name.toLowerCase().includes(menuSearch.toLowerCase())
    );

    const totalItems = currentOrderItems.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="order-form-container">
            <div className="of-sheet">
                {/* ── Header ── */}
                <div className="of-header">
                    <div className="of-header-left">
                        <span className="of-title">New Order</span>
                        {currentEvent && <span className="of-active-event">{currentEvent.name}</span>}
                    </div>
                </div>

                {/* ── Mobile Tabs ── */}
                <div className="of-tabs">
                    <button
                        className={`of-tab ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Order Details
                        {totalItems > 0 && <span className="of-tab-badge">{totalItems}</span>}
                    </button>
                    <button
                        className={`of-tab ${activeTab === 'menu' ? 'active' : ''}`}
                        onClick={() => setActiveTab('menu')}
                    >
                        Add Items
                    </button>
                </div>

                {/* ── Body ── */}
                <form onSubmit={handleSubmit} className="of-body">
                    <div className="of-columns">
                        {/* ── Left / Details Panel ── */}
                        <div className={`of-panel of-panel-details ${activeTab === 'details' ? 'of-panel-active' : ''}`}>
                            <section className="of-section">
                                <h3 className="of-section-title">Customer Info</h3>
                                <div className="of-field-row">
                                    <div className="of-field of-field-sm">
                                        <label className="of-label" htmlFor="of-table">Table</label>
                                        <input
                                            id="of-table"
                                            className="of-input"
                                            type="number"
                                            value={tableNumber}
                                            onChange={e => setTableNumber(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="—"
                                            min={0}
                                        />
                                    </div>
                                    <div className="of-field of-field-grow">
                                        <label className="of-label" htmlFor="of-customer">Name</label>
                                        <input
                                            id="of-customer"
                                            className="of-input"
                                            type="text"
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>

                                <div className="of-toggles">
                                    <label className="of-toggle-row" onClick={() => setIsPreOrder(v => !v)}>
                                        <span className="of-toggle-label">
                                            <span className="of-toggle-icon">📦</span>
                                            Pre-Order
                                        </span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={isPreOrder}
                                            className={`of-switch ${isPreOrder ? 'on' : ''}`}
                                        >
                                            <span className="of-switch-thumb" />
                                        </button>
                                    </label>
                                    <label className="of-toggle-row" onClick={() => setIsPaid(v => !v)}>
                                        <span className="of-toggle-label">
                                            <span className="of-toggle-icon">💳</span>
                                            Paid
                                        </span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={isPaid}
                                            className={`of-switch ${isPaid ? 'on' : ''}`}
                                        >
                                            <span className="of-switch-thumb" />
                                        </button>
                                    </label>
                                </div>

                                {isPreOrder && (
                                    <div className="of-field of-field-full of-slide-in">
                                        <label className="of-label" htmlFor="of-address">Delivery Address</label>
                                        <input
                                            id="of-address"
                                            className="of-input"
                                            type="text"
                                            value={deliveryAddress}
                                            onChange={e => setDeliveryAddress(e.target.value)}
                                            placeholder="e.g., 123 Main St"
                                        />
                                    </div>
                                )}
                            </section>

                            <section className="of-section">
                                <div className="of-section-header">
                                    <h3 className="of-section-title">Order Items</h3>
                                    <button
                                        type="button"
                                        className="of-add-more-btn"
                                        onClick={() => setActiveTab('menu')}
                                    >
                                        + Add Items
                                    </button>
                                </div>

                                {currentOrderItems.length === 0 ? (
                                    <div className="of-empty-items">
                                        <span className="of-empty-icon">🛒</span>
                                        <p>No items yet. Tap <strong>Add Items</strong> to start.</p>
                                    </div>
                                ) : (
                                    <ul className="of-items-list">
                                        {currentOrderItems.map((item, index) => {
                                            const mi = getMenuItem(item.menuItem);
                                            return (
                                                <li key={index} className="of-item-card">
                                                    <div className="of-item-top">
                                                        <span className="of-item-name">{mi ? mi.name : 'Unknown Item'}</span>
                                                        <div className="of-item-right">
                                                            {mi && <span className="of-item-price">¥{(mi.price * item.quantity).toLocaleString()}</span>}
                                                            <button
                                                                type="button"
                                                                className="of-remove-btn"
                                                                onClick={() => handleRemoveItem(index)}
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="of-item-bottom">
                                                        <div className="of-qty-control">
                                                            <button type="button" className="of-qty-btn" onClick={() => handleQuantityChange(index, item.quantity - 1)}>−</button>
                                                            <span className="of-qty-num">{item.quantity}</span>
                                                            <button type="button" className="of-qty-btn" onClick={() => handleQuantityChange(index, item.quantity + 1)}>+</button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="of-remark-input"
                                                            placeholder="Remarks..."
                                                            value={item.remarks || ''}
                                                            onChange={e => handleRemarkChange(index, e.target.value)}
                                                        />
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                {currentOrderItems.length > 0 && (
                                    <div className="of-total-row">
                                        <span>Total</span>
                                        <span className="of-total-amount">¥{calculateTotal().toLocaleString()}</span>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* ── Right / Menu Panel ── */}
                        <div className={`of-panel of-panel-menu ${activeTab === 'menu' ? 'of-panel-active' : ''}`}>
                            <section className="of-menu-section">
                                <div className="of-menu-search-wrap">
                                    <svg className="of-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        className="of-menu-search"
                                        type="text"
                                        placeholder="Search menu…"
                                        value={menuSearch}
                                        onChange={e => setMenuSearch(e.target.value)}
                                    />
                                    {menuSearch && (
                                        <button type="button" className="of-search-clear" onClick={() => setMenuSearch('')}>✕</button>
                                    )}
                                </div>
                                <div className="of-menu-grid">
                                    {filteredMenuItems.length === 0 ? (
                                        <p className="of-no-results">No items match "{menuSearch}"</p>
                                    ) : filteredMenuItems.map(item => {
                                        const inOrder = currentOrderItems.find(i => i.menuItem === item._id);
                                        return (
                                            <button
                                                type="button"
                                                key={item._id}
                                                className={`of-menu-card ${inOrder ? 'in-order' : ''}`}
                                                onClick={() => handleAddItem(item._id)}
                                            >
                                                {inOrder && <span className="of-menu-badge">{inOrder.quantity}</span>}
                                                <span className="of-menu-name">{item.name}</span>
                                                <span className="of-menu-price">¥{item.price.toLocaleString()}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="of-footer">
                        <button type="submit" className="of-btn-submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><span className="of-spinner" /> Submitting…</>
                            ) : (
                                <>
                                    <span>Submit Order</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrderForm;
