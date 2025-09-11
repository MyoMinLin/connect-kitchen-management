import React from 'react';
import './ReadyNotification.css';

interface ReadyNotificationProps {
    tableNumber: number;
    onClear: () => void;
}

const ReadyNotification: React.FC<ReadyNotificationProps> = ({ tableNumber, onClear }) => {
    return (
        <div className="notification-overlay">
            <div className="notification-modal">
                <h2>Order Ready!</h2>
                <p>The order for <strong>Table {tableNumber}</strong> is ready for pickup.</p>
                <button onClick={onClear} className="clear-btn">Clear Notification</button>
            </div>
        </div>
    );
};

export default ReadyNotification;
