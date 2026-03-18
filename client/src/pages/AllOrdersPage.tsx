
import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderItem } from '../types';
import { useSocket } from '../hooks/useSocket';
import { useEvent } from '../context/EventContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/apiConfig';
import EditOrderModal from '../components/EditOrderModal';
import AddressModal from '../components/AddressModal';
import ReceiptModal from '../components/ReceiptModal';
import './AllOrdersPage.css';
import { format } from 'date-fns';

import { fetchWithLoader } from '../utils/api';

const AllOrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const { currentEvent } = useEvent();
    const socket = useSocket();
    const { user } = useAuth();
    interface AddressViewData {
        address: string;
        customerName: string;
        orderNo: string | number;
    }

    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [viewingAddress, setViewingAddress] = useState<AddressViewData | null>(null);
    const [viewingReceiptOrder, setViewingReceiptOrder] = useState<Order | null>(null);

    const fetchOrders = async (eventId: string) => {
        try {
            const response = await fetchWithLoader(`${API_BASE_URL}/api/orders/event/${eventId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Failed to fetch orders');
            const data = await response.json();
            setOrders(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setOrders([]);
        }
    };

    useEffect(() => {
        if (currentEvent) {
            fetchOrders(currentEvent._id);
        } else {
            setOrders([]);
        }
    }, [currentEvent]);

    useEffect(() => {
        if (!socket || !currentEvent) return;

        const handleOrderUpdate = (updatedOrder: Order) => {
            setOrders(prevOrders => {
                if (updatedOrder.eventId !== currentEvent._id) {
                    return prevOrders;
                }

                const existingOrderIndex = prevOrders.findIndex(o => o._id === updatedOrder._id);
                if (existingOrderIndex !== -1) {
                    const newOrders = [...prevOrders];
                    newOrders[existingOrderIndex] = updatedOrder;
                    return newOrders;
                } else {
                    return [updatedOrder, ...prevOrders];
                }
            });
        };

        socket.on('order_update', handleOrderUpdate);

        return () => {
            socket.off('order_update', handleOrderUpdate);
        };
    }, [socket, currentEvent]);

    const handleMarkAsCollected = (orderId: string) => {
        if (socket) {
            socket.emit('update_order_status', { orderId, status: 'Collected' });
        }
    };

    const handleMarkAsPaid = (orderId: string) => {
        return new Promise<void>((resolve) => {
            if (socket) {
                socket.emit('update_payment_status', { orderId, isPaid: true });
                // We add a brief delay so the user can actually see the loading state
                setTimeout(resolve, 600);
            } else {
                resolve();
            }
        });
    };

    const handleEditOrder = (orderId: string, data: {
        seatNumber?: string;
        customerName?: string;
        items: OrderItem[];
        isPreOrder: boolean;
        isPaid: boolean;
        deliveryAddress?: string;
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

    const sortOrders = (orders: Order[]) => {
        return orders.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt);
            const dateB = new Date(b.updatedAt || b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
    };

    const activeOrders = useMemo(() => sortOrders(orders.filter(order => order.status !== 'Collected' && order.status !== 'Cancelled')), [orders]);
    const collectedOrders = useMemo(() => sortOrders(orders.filter(order => order.status === 'Collected')), [orders]);

    const calculateOrderTotal = (order: Order) => {
        const total = order.items.reduce((sum, item) => sum + (item.quantity * (item.menuItem.price || 0)), 0);
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(total);
    };

    const aggregateItems = (items: Order['items']) => {
        const itemMap = new Map<string, { quantity: number; remarks: string[] }>();
        items.forEach(item => {
            const key = item.menuItem.name;
            const existing = itemMap.get(key);
            if (existing) {
                existing.quantity += item.quantity;
                if (item.remarks) existing.remarks.push(item.remarks);
            } else {
                itemMap.set(key, {
                    quantity: item.quantity,
                    remarks: item.remarks ? [item.remarks] : [],
                });
            }
        });
        return Array.from(itemMap.entries()).map(([name, data]) => ({
            name,
            ...data,
        }));
    };

    const canEdit = user && (user.role === 'Admin' || user.role === 'Waiter');

    return (
        <div className="all-orders-page">
            <h1>လက်ရှိအော်ဒါများ {currentEvent ? `(${currentEvent.name})` : ''}</h1>
            {!currentEvent && <p>Please select an event from the Admin menu to view orders.</p>}
            {currentEvent && (
                <div className="orders-list-container">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>Type & ID</th>
                                <th>Seat</th>
                                <th>Item</th>
                                <th>Total Amount</th>
                                <th>Ordered At</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeOrders.map(order => (
                                <tr key={order._id} className={`status-${order.status.toLowerCase()}`}>
                                    <td data-label="Order Status">
                                        <div className="order-type-wrapper">
                                            <div className="order-type-header">
                                                <span className={`order-type-badge ${order.isPreOrder ? 'type-pre' : 'type-seat'}`}>
                                                    {order.isPreOrder ? (
                                                        <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> Pre-Order</>
                                                    ) : (
                                                        <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18V5"></path><path d="M12 5v13"></path><path d="M17 12h-5"></path><path d="M17 5v7"></path><path d="M7 12h5"></path></svg> Seat Order</>
                                                    )}
                                                </span>
                                                <span className="order-number-text">#{order.orderNumber}</span>
                                            </div>
                                            {order.isPreOrder && order.customerName && (
                                                <span className="order-customer-name">👤 {order.customerName}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td data-label="Seat">
                                        {order.seatNumber ? (
                                            <span className="seat-badge">{order.seatNumber}</span>
                                        ) : (
                                            <span className="no-seat">-</span>
                                        )}
                                    </td>
                                    <td data-label="Item">
                                        <ul>
                                            {aggregateItems(order.items).map((item, index) => (
                                                <li key={index}>
                                                    {item.quantity}x {item.name}
                                                    {item.remarks.length > 0 && <span className="item-remarks"> ({item.remarks.join(', ')})</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td data-label="Total Amount">
                                        <div className="amount-wrapper">
                                            <span className="total-amount-text">{calculateOrderTotal(order)}</span>
                                            <span className={`payment-badge ${order.isPaid ? 'paid' : 'pending'}`}>
                                                {order.isPaid ? 'Paid' : 'Pending'}
                                            </span>
                                        </div>
                                    </td>
                                    <td data-label="Ordered At">{format(new Date(order.createdAt), 'p')}</td>
                                    <td data-label="Status">
                                        <span className="status-badge">{order.status}</span>
                                    </td>
                                    <td data-label="Action">
                                        <div className="action-buttons-wrapper">
                                            {canEdit && order.status !== 'Collected' && (
                                                <button
                                                    className="icon-action-btn edit-btn"
                                                    onClick={() => setEditingOrder(order)}
                                                    title="Edit Order"
                                                    aria-label={`Edit order ${order.orderNumber}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                                    </svg>
                                                </button>
                                            )}
                                            {order.isPreOrder && (
                                                <button
                                                    className="icon-action-btn address-btn"
                                                    onClick={() => setViewingAddress({
                                                        address: order.deliveryAddress || '',
                                                        customerName: order.customerName || 'Unknown',
                                                        orderNo: order.orderNumber
                                                    })}
                                                    title="View Delivery Address"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="1" y="3" width="15" height="13"></rect>
                                                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                                                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                                    </svg>
                                                </button>
                                            )}
                                            {!order.isPaid && order.paymentProof && (
                                                <button
                                                    className="icon-action-btn verify-btn"
                                                    onClick={() => handleMarkAsPaid(order._id)}
                                                    title="Mark as Paid"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                    </svg>
                                                </button>
                                            )}
                                            {order.paymentProof && (
                                                <button
                                                    className="icon-action-btn receipt-btn"
                                                    onClick={() => setViewingReceiptOrder(order)}
                                                    title="View Receipt"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
                                                        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
                                                        <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
                                                    </svg>
                                                </button>
                                            )}
                                            {order.status === 'Ready' && (
                                                <button
                                                    className="action-btn collected-btn"
                                                    onClick={() => handleMarkAsCollected(order._id)}
                                                >
                                                    Mark as Collected
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {currentEvent && collectedOrders.length > 0 && (
                <>
                    <h2 className="collected-orders-title">Collected Orders</h2>
                    <div className="orders-list-container">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Type & ID</th>
                                    <th>Seat</th>
                                    <th>Item</th>
                                    <th>Ordered At</th>
                                    <th>Total Amount</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collectedOrders.map(order => (
                                    <tr key={order._id} className={`status-${order.status.toLowerCase()}`}>
                                        <td data-label="Order Status">
                                            <div className="order-type-wrapper">
                                                <div className="order-type-header">
                                                    <span className={`order-type-badge ${order.isPreOrder ? 'type-pre' : 'type-seat'}`}>
                                                        {order.isPreOrder ? (
                                                            <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> Pre-Order</>
                                                        ) : (
                                                            <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18V5"></path><path d="M12 5v13"></path><path d="M17 12h-5"></path><path d="M17 5v7"></path><path d="M7 12h5"></path></svg> Seat Order</>
                                                        )}
                                                    </span>
                                                    <span className="order-number-text">#{order.orderNumber}</span>
                                                </div>
                                                {order.isPreOrder && order.customerName && (
                                                    <span className="order-customer-name">👤 {order.customerName}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="Seat">
                                            {order.seatNumber ? (
                                                <span className="seat-badge">{order.seatNumber}</span>
                                            ) : (
                                                <span className="no-seat">-</span>
                                            )}
                                        </td>
                                        <td data-label="Item">
                                            <ul>
                                                {aggregateItems(order.items).map((item, index) => (
                                                    <li key={index}>
                                                        {item.quantity}x {item.name}
                                                        {item.remarks.length > 0 && <span className="item-remarks"> ({item.remarks.join(', ')})</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td data-label="Total Amount">
                                            <div className="amount-wrapper">
                                                <span className="total-amount-text">{calculateOrderTotal(order)}</span>
                                                <span className={`payment-badge ${order.isPaid ? 'paid' : 'pending'}`}>
                                                    {order.isPaid ? 'Paid' : 'Pending'}
                                                </span>
                                            </div>
                                        </td>
                                        <td data-label="Ordered At">{format(new Date(order.createdAt), 'p')}</td>
                                        <td data-label="Status">
                                            <span className="status-badge">{order.status}</span>
                                        </td>
                                        <td data-label="Action">
                                            <div className="action-buttons-wrapper">
                                                {order.isPreOrder && (
                                                    <button
                                                        className="icon-action-btn address-btn"
                                                        onClick={() => setViewingAddress({
                                                            address: order.deliveryAddress || '',
                                                            customerName: order.customerName || 'Unknown',
                                                            orderNo: order.orderNumber
                                                        })}
                                                        title="View Delivery Address"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="1" y="3" width="15" height="13"></rect>
                                                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                                                            <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                                            <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                                        </svg>
                                                    </button>
                                                )}
                                                {!order.isPaid && order.paymentProof && (
                                                    <button
                                                        className="icon-action-btn verify-btn"
                                                        onClick={() => handleMarkAsPaid(order._id)}
                                                        title="Mark as Paid"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                        </svg>
                                                    </button>
                                                )}
                                                {order.paymentProof && (
                                                    <button
                                                        className="icon-action-btn receipt-btn"
                                                        onClick={() => setViewingReceiptOrder(order)}
                                                        title="View Receipt"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
                                                            <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
                                                            <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {editingOrder && (
                <EditOrderModal
                    order={editingOrder}
                    onClose={() => setEditingOrder(null)}
                    onSubmit={handleEditOrder}
                />
            )}

            {viewingAddress !== null && (
                <AddressModal
                    address={viewingAddress.address}
                    customerName={viewingAddress.customerName}
                    orderNo={viewingAddress.orderNo}
                    onClose={() => setViewingAddress(null)}
                />
            )}

            {viewingReceiptOrder && (
                <ReceiptModal 
                    imageUrl={viewingReceiptOrder.paymentProof as string} 
                    isPaid={viewingReceiptOrder.isPaid}
                    orderNumber={viewingReceiptOrder.orderNumber.toString()}
                    customerName={viewingReceiptOrder.customerName}
                    onVerify={() => handleMarkAsPaid(viewingReceiptOrder._id)}
                    onClose={() => setViewingReceiptOrder(null)} 
                />
            )}
        </div>
    );
};

export default AllOrdersPage;
