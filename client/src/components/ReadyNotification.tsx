import React from 'react';
import { useTranslation } from 'react-i18next';
import './ReadyNotification.css';

interface ReadyNotificationProps {
    orderNumber: string;
    onClear: () => void;
}

const ReadyNotification: React.FC<ReadyNotificationProps> = ({ orderNumber, onClear }) => {
    const { t } = useTranslation();

    const handleClear = () => {
        const audio = new Audio('/notification-sounds/alert_high-intensity.wav');
        audio.play();
        onClear();
    };

    return (
        <div className="notification-overlay">
            <div className="notification-modal">
                <h2>{t('notification.orderReady')}</h2>
                <p dangerouslySetInnerHTML={{ __html: t('notification.orderReadyMessage', { orderNumber }) }} />
                <button onClick={handleClear} className="clear-btn">{t('notification.clearNotification')}</button>
            </div>
        </div>
    );
};

export default ReadyNotification;
