import React from 'react';
import { Order } from '../../types';

interface OrderHistoryListProps {
    orders: Order[];
}

const OrderHistoryList: React.FC<OrderHistoryListProps> = ({ orders }) => {
    return (
        <div className="orders-history-list-embedded">
            <h3 className="cat-title">My Orders</h3>
            {orders.length === 0 ? (
                <div className="empty-orders-embedded">
                    <div className="empty-icon">📦</div>
                    <p>You haven't placed any orders yet.</p>
                </div>
            ) : (
                orders.map((order) => (
                    <div key={order._id} className="order-history-card-v2">
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
                    </div>
                ))
            )}
        </div>
    );
};

export default OrderHistoryList;
