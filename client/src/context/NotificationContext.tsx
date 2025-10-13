import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ReadyOrder {
    orderNumber: string;
    orderId: string;
}

interface NotificationContextType {
    readyOrder: ReadyOrder | null;
    setReadyOrder: (order: ReadyOrder | null) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [readyOrder, setReadyOrder] = useState<ReadyOrder | null>(null);

    return (
        <NotificationContext.Provider value={{ readyOrder, setReadyOrder }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};