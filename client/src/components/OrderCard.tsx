import React from 'react';
import { Order } from '../types'; // Import Order from types.ts
import { useTranslation } from 'react-i18next';
import './OrderCard.css';
import { format } from 'date-fns-tz';

interface OrderCardProps {
    order: Order;
    onStatusUpdate: (orderId: string, status: Order['status']) => void;
    userRole: 'Admin' | 'Waiter' | 'Kitchen';
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onStatusUpdate, userRole }) => {
    const { t } = useTranslation();

    const getTimeElapsed = (startTime?: string) => {
        if (!startTime) return '';
        const now = new Date();
        const start = new Date(startTime);
        const diffMs = now.getTime() - start.getTime(); // Difference in milliseconds

        const minutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (days > 0) {
            // More than 1 day, show date and time
            return format(start, 'PPpp', { timeZone: userTimeZone });
        } else if (hours > 0) {
            // Less than 1 day but more than 1 hour
            const remainingMinutes = minutes % 60;
            return `${hours}hr ${remainingMinutes}m ago`;
        } else {
            // Less than 1 hour
            return `${minutes}m ago`;
        }
    };

    const getTimestampForStatus = () => {
        switch (order.status) {
            case 'New':
                return getTimeElapsed(order.createdAt);
            case 'Preparing':
                return getTimeElapsed(order.preparingStartedAt);
            case 'Ready':
                return getTimeElapsed(order.readyAt);
            case 'Collected':
                return getTimeElapsed(order.collectedAt);
            case 'Cancelled':
                return getTimeElapsed(order.cancelledAt);
            default:
                return getTimeElapsed(order.createdAt);
        }
    }

    return (
        <div className={`order-card status-${order.status.toLowerCase().replace(' ', '-')}`}>
            <div className="card-header">
                <h4>{t('orderCard.orderNumber', { number: order.orderNumber })}</h4>
                <span className="time-elapsed">{getTimestampForStatus()}</span>
            </div>
            {order.seatNumber && <p className="seat-number">{t('orderCard.seatLabel', { seat: order.seatNumber })}</p>}
            {order.customerName && <p className="customer-name">{t('orderCard.customerLabel', { name: order.customerName })}</p>}
            <ul className="item-list">
                {order.items
                    .filter(item => item.menuItem && item.menuItem.requiresPrep)
                    .map((item, index) => (
                        <li key={index}>
                            {item.quantity}x {item.menuItem.name}
                            {item.remarks && <span className="item-remarks"> ({item.remarks})</span>}
                        </li>
                    ))}
            </ul>
            <div className="card-actions">
                {userRole === 'Kitchen' && order.status === 'New' && (
                    <button onClick={() => onStatusUpdate(order._id, 'Preparing')} className="action-btn progress-btn">
                        {t('orderCard.startCooking')}
                    </button>
                )}
                {userRole === 'Kitchen' && order.status === 'Preparing' && (
                    <button onClick={() => onStatusUpdate(order._id, 'Ready')} className="action-btn ready-btn">
                        {t('orderCard.markAsReady')}
                    </button>
                )}
                {userRole === 'Waiter' && order.status === 'Ready' && (
                    <button onClick={() => onStatusUpdate(order._id, 'Collected')} className="action-btn collected-btn">
                        {t('orderCard.markAsCollected')}
                    </button>
                )}
                {(userRole === 'Kitchen' || userRole === 'Admin') && (order.status === 'New' || order.status === 'Preparing') && (
                    <button
                        onClick={() => {
                            if (window.confirm(t('orderCard.cancelConfirm'))) {
                                onStatusUpdate(order._id, 'Cancelled');
                            }
                        }}
                        className="action-btn cancel-btn"
                    >
                        {t('orderCard.cancel')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default OrderCard;
