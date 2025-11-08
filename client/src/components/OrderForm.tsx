import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuItem, OrderItem, Event } from '../types'; // Import from types.ts
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext'; // Import useEvent
import { API_BASE_URL } from '../utils/apiConfig';
import { fetchWithLoader } from '../utils/api';
import './OrderForm.css';

interface OrderFormProps {
    onSubmit: (order: { eventId: string; tableNumber: number; customerName?: string; items: OrderItem[]; isPreOrder: boolean; isPaid: boolean; deliveryAddress?: string; }) => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ onSubmit }) => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [tableNumber, setTableNumber] = useState<number | ''>(''); // Change to number
    const [customerName, setCustomerName] = useState<string>('');
    const [isPreOrder, setIsPreOrder] = useState<boolean>(false);
    const [isPaid, setIsPaid] = useState<boolean>(false);
    const [deliveryAddress, setDeliveryAddress] = useState<string>('');
    const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [lastOrderNumber, setLastOrderNumber] = useState<string>('');

    const { token, logout } = useAuth();
    const { currentEvent } = useEvent(); // Use currentEvent from context
    const navigate = useNavigate();


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
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        setLastOrderNumber(data.orderNumber);
                    }
                })
                .catch(err => console.error("Failed to fetch last order number:", err));
        }
    }, [token]);


    // Effect to fetch menu items for the current event
    useEffect(() => {
        if (token && currentEvent) {
            fetchWithLoader(`${API_BASE_URL}/api/menu-items/event/${currentEvent._id}`, { // Fetch menu items by event ID
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
        } else if (token && !currentEvent) {
            // If no current event, clear menu items
            setMenuItems([]);
        }
    }, [token, logout, currentEvent]); // Add currentEvent to dependency array

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
        if (!currentEvent) {
            alert('No active event selected. Cannot create order.');
            return;
        }
        if (currentOrderItems.length === 0) {
            alert('Please add items to the order.');
            return;
        }
        
        onSubmit({ eventId: currentEvent._id, tableNumber: tableNumber as number, customerName, items: currentOrderItems, isPreOrder, isPaid, deliveryAddress });
        setCurrentOrderItems([]); // Reset form
        setTableNumber(''); // Reset table number
        setCustomerName(''); // Reset customer name
        navigate('/orders'); // Redirect to all orders page
    };

    return (
        <div className="order-form-container">
            <form onSubmit={handleSubmit} className="order-form">
                <h3>Create New Order</h3>
                {currentEvent ? (
                    <p className="active-event-display">Active Event: <strong>{currentEvent.name}</strong></p>
                ) : (
                    <p className="no-active-event">No active event selected.</p>
                )}
                <div className="form-group">
                    <label htmlFor="tableNumber">Table Number</label>
                    <input
                        id="tableNumber"
                        type="number" // Change type to number
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g., 12"
                        required
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
