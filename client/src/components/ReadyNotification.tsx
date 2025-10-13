import React from 'react';
import './ReadyNotification.css';

interface ReadyNotificationProps {
    orderNumber: string;
    onClear: () => void;
}

const ReadyNotification: React.FC<ReadyNotificationProps> = ({ orderNumber, onClear }) => {
    const handleClear = () => {
        const audio = new Audio('/notification-sounds/alert_high-intensity.wav');
        audio.play();
        onClear();
    };

    return (
        <div className="notification-overlay">
            <div className="notification-modal">
                <h2>Order Ready!</h2>
                <p>The order for <strong>{orderNumber}</strong> is ready for pickup.</p>
                <button onClick={handleClear} className="clear-btn">Clear Notification</button>
            </div>
        </div>
    );
};

export default ReadyNotification;
