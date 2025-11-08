import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuItem, OrderItem, Event } from '../pages/WaitstaffPage';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/apiConfig';
import { fetchWithLoader } from '../utils/api';
import './OrderForm.css';

interface OrderFormProps {
    onSubmit: (order: { eventId: string; tableNumber?: string; customerName?: string; items: OrderItem[]; isPreOrder: boolean; isPaid: boolean; deliveryAddress?: string; }) => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ onSubmit }) => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [tableNumber, setTableNumber] = useState<string>('');
    const [customerName, setCustomerName] = useState<string>('');
    const [isPreOrder, setIsPreOrder] = useState<boolean>(false);
    const [isPaid, setIsPaid] = useState<boolean>(false);
    const [deliveryAddress, setDeliveryAddress] = useState<string>('');
    const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
    const [events, setEvents] = useState<Event[]>([]); // New state for events
    const [activeEvent, setActiveEvent] = useState<Event | null>(null); // New state for active event
    const [lastOrderNumber, setLastOrderNumber] = useState<string>('');

    const { token, logout } = useAuth();
    const navigate = useNavigate();

    // Effect to fetch events and determine the active event
    useEffect(() => {
        if (token) {
            fetchWithLoader(`${API_BASE_URL}/api/events/active`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => {
                    if (res.status === 401) {
                        logout();
                        throw new Error('Unauthorized');
                    }
                    return res.json();
                })
                .then(data => {
                    if (data.message) throw new Error(data.message);
                    setEvents(data);
                })
                .catch(err => console.error("Failed to fetch events:", err));
        }
    }, [token, logout]);

    useEffect(() => {
        if (token) {
            fetchWithLoader(`${API_BASE_URL}/api/orders/last`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.orderNumber) {
                        setLastOrderNumber(data.orderNumber);
                    }
                })
                .catch(err => console.error("Failed to fetch last order number:", err));
        }
    }, [token]);

    // Effect to determine the active event from fetched events
    useEffect(() => {
        if (events.length > 0) { // Check if events is not null and has length
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Filter events for the current month and future
            const currentMonthEvents = events.filter(event => {
                const eventDate = new Date(event.eventDate);
                return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear() && eventDate >= today;
            });

            if (currentMonthEvents.length === 1) {
                setActiveEvent(currentMonthEvents[0]);
            } else if (currentMonthEvents.length > 1) {
                // Find the event closest to today's date
                const closestEvent = currentMonthEvents.reduce((prev, curr) => {
                    const prevDate = new Date(prev.eventDate);
                    const currDate = new Date(curr.eventDate);
                    const diffPrev = Math.abs(prevDate.getTime() - today.getTime());
                    const diffCurr = Math.abs(currDate.getTime() - today.getTime());
                    return (diffCurr < diffPrev) ? curr : prev;
                });
                setActiveEvent(closestEvent);
            } else {
                setActiveEvent(null); // No active event for the current month
            }
        }
    }, [events]);

    // Effect to fetch menu items for the active event
    useEffect(() => {
        if (token && activeEvent) {
            fetchWithLoader(`${API_BASE_URL}/api/menu-items/event/${activeEvent._id}`, { // Fetch menu items by event ID
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => {
                    if (res.status === 401) {
                        logout();
                        throw new Error('Unauthorized');
                    }
                    return res.json();
                })
                .then(data => {
                    if (data.message) throw new Error(data.message);
                    setMenuItems(data)
                })
                .catch(err => console.error("Failed to fetch menu items:", err));
        } else if (token && !activeEvent) {
            // If no active event, clear menu items
            setMenuItems([]);
        }
    }, [token, logout, activeEvent]); // Add activeEvent to dependency array

    const handleAddItem = (menuItemId: string) => {
        setCurrentOrderItems(prevItems => {
            // Always add a new item, do not increment quantity of existing ones
            return [...prevItems, { menuItem: menuItemId, quantity: 1, remarks: '' }];
        });
    };

    const handleRemoveItem = (index: number) => {
        setCurrentOrderItems(prevItems => prevItems.filter((_, i) => i !== index));
    };

    const handleRemarkChange = (index: number, remark: string) => {
        setCurrentOrderItems(prevItems =>
            prevItems.map((item, i) => (i === index ? { ...item, remarks: remark } : item))
        );
    };

    const getMenuItem = (menuItemId: string): MenuItem | undefined => {
        return menuItems.find(mi => mi._id === menuItemId);
    };

    const calculateTotal = () => {
        return currentOrderItems.reduce((total, currentItem) => {
            const menuItem = getMenuItem(currentItem.menuItem);
            if (menuItem) {
                return total + (menuItem.price * currentItem.quantity);
            }
            return total;
        }, 0);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeEvent) {
            alert('No active event selected. Cannot create order.');
            return;
        }
        if (currentOrderItems.length === 0) {
            alert('Please add items to the order.');
            return;
        }
        onSubmit({ eventId: activeEvent._id, tableNumber, customerName, items: currentOrderItems, isPreOrder, isPaid, deliveryAddress });
        setCurrentOrderItems([]); // Reset form
        setTableNumber(''); // Reset table number
        setCustomerName(''); // Reset customer name
        navigate('/orders'); // Redirect to all orders page
    };

    return (
        <div className="order-form-container">
            <form onSubmit={handleSubmit} className="order-form">
                <h3>Create New Order</h3>
                {activeEvent ? (
                    <p className="active-event-display">Active Event: <strong>{activeEvent.name}</strong></p>
                ) : (
                    <p className="no-active-event">No active event found for this month.</p>
                )}
                {/* {lastOrderNumber && (
                    <p className="last-order-number">Last Order: <strong>{lastOrderNumber}</strong></p>
                )} */}
                <div className="form-group">
                    <label htmlFor="tableNumber">Table Number</label>
                    <input
                        id="tableNumber"
                        type="text"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g., 12"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="customerName">Customer Name (Optional)</label>
                    <input
                        id="customerName"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g., John Doe"
                    />
                </div>
                <div className="form-group toggle-group">
                    <label htmlFor="isPreOrder">Pre-Order</label>
                    <label className="toggle-switch">
                        <input
                            id="isPreOrder"
                            type="checkbox"
                            checked={isPreOrder}
                            onChange={(e) => setIsPreOrder(e.target.checked)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="form-group toggle-group">
                    <label htmlFor="isPaid">Paid?</label>
                    <label className="toggle-switch">
                        <input
                            id="isPaid"
                            type="checkbox"
                            checked={isPaid}
                            onChange={(e) => setIsPaid(e.target.checked)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="form-group">
                    <label htmlFor="deliveryAddress">Delivery Address</label>
                    <input
                        id="deliveryAddress"
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="e.g., 123 Main St"
                        disabled={!isPreOrder}
                    />
                </div>
                <div className="menu-items-list">
                    <h3>Menu</h3>
                    <div className="menu-grid">
                        {menuItems.map(item => (
                            <button type="button" key={item._id} onClick={() => handleAddItem(item._id)} className="menu-item-btn">
                                {item.name} (¥{item.price})
                            </button>
                        ))}
                    </div>
                </div>
                <div className="order-summary">
                    <h4>Current Order</h4>
                    {currentOrderItems.length === 0 ? (
                        <p>No items added yet.</p>
                    ) : (
                        <ul>
                            {currentOrderItems.map((item, index) => {
                                const menuItem = getMenuItem(item.menuItem);
                                return (
                                    <li key={index}>
                                        {menuItem ? menuItem.name : 'Unknown Item'} x {item.quantity}
                                        {menuItem && <span className="item-price">¥{menuItem.price.toFixed(2)}</span>}
                                        <input
                                            type="text"
                                            placeholder="Remarks (e.g., no onions)"
                                            value={item.remarks || ''}
                                            onChange={(e) => handleRemarkChange(index, e.target.value)}
                                            className="item-remark-input"
                                        />
                                        <button type="button" onClick={() => handleRemoveItem(index)} className="remove-item-btn action-btn">Remove</button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                <div className="total-amount-display">
                    <label>Total Amount</label>
                    <span>¥{calculateTotal().toFixed(2)}</span>
                </div>
                <button type="submit" className="submit-btn">Submit Order</button>
            </form>
        </div>
    );
};

export default OrderForm;
