import React, { useState, useEffect, useCallback } from 'react';
import { MenuItem, Order, OrderItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { API_BASE_URL } from '../utils/apiConfig';
import { fetchWithLoader } from '../utils/api';
import './EditOrderModal.css';

interface EditOrderModalProps {
    order: Order;
    onClose: () => void;
    onSubmit: (orderId: string, data: {
        tableNumber: number;
        customerName?: string;
        items: OrderItem[];
        isPreOrder: boolean;
        isPaid: boolean;
        deliveryAddress?: string;
    }) => Promise<void>;
}

const STATUS_COLORS: Record<string, string> = {
    New: '#3b82f6',
    Preparing: '#f59e0b',
    Ready: '#10b981',
    Cancelled: '#ef4444',
    Collected: '#6b7280',
};

const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, onClose, onSubmit }) => {
    const { token, logout } = useAuth();
    const { currentEvent } = useEvent();

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [menuSearch, setMenuSearch] = useState('');
    const [tableNumber, setTableNumber] = useState<number | ''>(order.tableNumber ?? '');
    const [customerName, setCustomerName] = useState<string>(order.customerName ?? '');
    const [isPreOrder, setIsPreOrder] = useState<boolean>(order.isPreOrder);
    const [isPaid, setIsPaid] = useState<boolean>(order.isPaid);
    const [deliveryAddress, setDeliveryAddress] = useState<string>(order.deliveryAddress ?? '');
    const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>(
        order.items.map(item => ({
            menuItem: item.menuItem._id,
            quantity: item.quantity,
            remarks: item.remarks ?? '',
        }))
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'menu'>('details');

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
                .catch(err => console.error('Failed to fetch menu items:', err));
        }
    }, [token, logout, currentEvent]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleKeyDown]);

    const handleAddItem = (menuItemId: string) => {
        setCurrentOrderItems(prev => {
            const existing = prev.findIndex(i => i.menuItem === menuItemId);
            if (existing !== -1) {
                const updated = [...prev];
                updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
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

    const getMenuItem = (menuItemId: string): MenuItem | undefined =>
        menuItems.find(mi => mi._id === menuItemId);

    const calculateTotal = () =>
        currentOrderItems.reduce((total, item) => {
            const mi = getMenuItem(item.menuItem);
            return mi ? total + mi.price * item.quantity : total;
        }, 0);

    const filteredMenuItems = menuItems.filter(mi =>
        mi.name.toLowerCase().includes(menuSearch.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (currentOrderItems.length === 0) {
            alert('Please add at least one item to the order.');
            return;
        }
        if (isSubmitting) return;
        try {
            setIsSubmitting(true);
            await onSubmit(order._id, {
                tableNumber: tableNumber as number,
                customerName,
                items: currentOrderItems,
                isPreOrder,
                isPaid,
                deliveryAddress,
            });
            onClose();
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Failed to update order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusColor = STATUS_COLORS[order.status] || '#6b7280';
    const totalItems = currentOrderItems.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="eom-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Edit Order">
            <div className="eom-sheet" onClick={e => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className="eom-header">
                    <div className="eom-header-left">
                        <span className="eom-title">Edit Order</span>
                        <span className="eom-order-num">#{order.orderNumber}</span>
                        <span className="eom-status-pill" style={{ background: statusColor }}>
                            {order.status}
                        </span>
                    </div>
                    <button className="eom-close" onClick={onClose} aria-label="Close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ── Mobile Tabs ── */}
                <div className="eom-tabs">
                    <button
                        className={`eom-tab ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Order Details
                        {totalItems > 0 && <span className="eom-tab-badge">{totalItems}</span>}
                    </button>
                    <button
                        className={`eom-tab ${activeTab === 'menu' ? 'active' : ''}`}
                        onClick={() => setActiveTab('menu')}
                    >
                        Add Items
                    </button>
                </div>

                {/* ── Body ── */}
                <form onSubmit={handleSubmit} className="eom-body">
                    <div className="eom-columns">

                        {/* ── Left / Details Panel ── */}
                        <div className={`eom-panel eom-panel-details ${activeTab === 'details' ? 'eom-panel-active' : ''}`}>

                            {/* Info fields */}
                            <section className="eom-section">
                                <h3 className="eom-section-title">Order Info</h3>
                                <div className="eom-field-row">
                                    <div className="eom-field eom-field-sm">
                                        <label className="eom-label" htmlFor="eom-table">Table</label>
                                        <input
                                            id="eom-table"
                                            className="eom-input"
                                            type="number"
                                            value={tableNumber}
                                            onChange={e => setTableNumber(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="—"
                                            min={0}
                                        />
                                    </div>
                                    <div className="eom-field eom-field-grow">
                                        <label className="eom-label" htmlFor="eom-customer">Customer Name</label>
                                        <input
                                            id="eom-customer"
                                            className="eom-input"
                                            type="text"
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>

                                <div className="eom-toggles">
                                    <label className="eom-toggle-row">
                                        <span className="eom-toggle-label">
                                            <span className="eom-toggle-icon">📦</span>
                                            Pre-Order
                                        </span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={isPreOrder}
                                            className={`eom-switch ${isPreOrder ? 'on' : ''}`}
                                            onClick={() => setIsPreOrder(v => !v)}
                                        >
                                            <span className="eom-switch-thumb" />
                                        </button>
                                    </label>
                                    <label className="eom-toggle-row">
                                        <span className="eom-toggle-label">
                                            <span className="eom-toggle-icon">💳</span>
                                            Paid
                                        </span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={isPaid}
                                            className={`eom-switch ${isPaid ? 'on' : ''}`}
                                            onClick={() => setIsPaid(v => !v)}
                                        >
                                            <span className="eom-switch-thumb" />
                                        </button>
                                    </label>
                                </div>

                                {isPreOrder && (
                                    <div className="eom-field eom-field-full eom-slide-in">
                                        <label className="eom-label" htmlFor="eom-address">Delivery Address</label>
                                        <input
                                            id="eom-address"
                                            className="eom-input"
                                            type="text"
                                            value={deliveryAddress}
                                            onChange={e => setDeliveryAddress(e.target.value)}
                                            placeholder="e.g., 123 Main St"
                                        />
                                    </div>
                                )}
                            </section>

                            {/* Order items */}
                            <section className="eom-section eom-items-section">
                                <div className="eom-section-header">
                                    <h3 className="eom-section-title">Order Items</h3>
                                    <button
                                        type="button"
                                        className="eom-add-more-btn"
                                        onClick={() => setActiveTab('menu')}
                                    >
                                        + Add Items
                                    </button>
                                </div>

                                {currentOrderItems.length === 0 ? (
                                    <div className="eom-empty-items">
                                        <span className="eom-empty-icon">🛒</span>
                                        <p>No items yet. Tap <strong>Add Items</strong> to get started.</p>
                                    </div>
                                ) : (
                                    <ul className="eom-items-list">
                                        {currentOrderItems.map((item, index) => {
                                            const mi = getMenuItem(item.menuItem);
                                            return (
                                                <li key={index} className="eom-item-card">
                                                    <div className="eom-item-top">
                                                        <span className="eom-item-name">{mi ? mi.name : 'Unknown Item'}</span>
                                                        <div className="eom-item-right">
                                                            {mi && <span className="eom-item-price">¥{(mi.price * item.quantity).toLocaleString()}</span>}
                                                            <button
                                                                type="button"
                                                                className="eom-remove-btn"
                                                                onClick={() => handleRemoveItem(index)}
                                                                aria-label="Remove item"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="eom-item-bottom">
                                                        <div className="eom-qty-control">
                                                            <button type="button" className="eom-qty-btn" onClick={() => handleQuantityChange(index, item.quantity - 1)}>−</button>
                                                            <span className="eom-qty-num">{item.quantity}</span>
                                                            <button type="button" className="eom-qty-btn" onClick={() => handleQuantityChange(index, item.quantity + 1)}>+</button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="eom-remark-input"
                                                            placeholder="Special request…"
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
                                    <div className="eom-total-row">
                                        <span>Total</span>
                                        <span className="eom-total-amount">¥{calculateTotal().toLocaleString()}</span>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* ── Right / Menu Panel ── */}
                        <div className={`eom-panel eom-panel-menu ${activeTab === 'menu' ? 'eom-panel-active' : ''}`}>
                            <section className="eom-section eom-menu-section">
                                <div className="eom-menu-search-wrap">
                                    <svg className="eom-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        className="eom-menu-search"
                                        type="text"
                                        placeholder="Search menu…"
                                        value={menuSearch}
                                        onChange={e => setMenuSearch(e.target.value)}
                                    />
                                    {menuSearch && (
                                        <button type="button" className="eom-search-clear" onClick={() => setMenuSearch('')}>✕</button>
                                    )}
                                </div>
                                <div className="eom-menu-grid">
                                    {filteredMenuItems.length === 0 ? (
                                        <p className="eom-no-results">No items match "{menuSearch}"</p>
                                    ) : filteredMenuItems.map(item => {
                                        const inOrder = currentOrderItems.find(i => i.menuItem === item._id);
                                        return (
                                            <button
                                                type="button"
                                                key={item._id}
                                                className={`eom-menu-card ${inOrder ? 'in-order' : ''}`}
                                                onClick={() => handleAddItem(item._id)}
                                            >
                                                {inOrder && <span className="eom-menu-badge">{inOrder.quantity}</span>}
                                                <span className="eom-menu-name">{item.name}</span>
                                                <span className="eom-menu-price">¥{item.price.toLocaleString()}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="eom-footer">
                        <button type="button" className="eom-btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="eom-btn-save" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><span className="eom-spinner" /> Saving…</>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditOrderModal;
