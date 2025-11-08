export interface Order {
    _id: string;
    eventId: string; // The ID of the associated event
    orderNumber: string;
    isPreOrder: boolean;
    isPaid: boolean;
    deliveryAddress?: string;
    tableNumber: number;
    customerName?: string;
    items: {
        menuItem: {
            _id: string;
            name: string;
            price: number;
            requiresPrep: boolean;
        };
        quantity: number;
        remarks?: string;
    }[];
    status: 'New' | 'Preparing' | 'Ready' | 'Collected' | 'Cancelled';
    createdAt: string;
    updatedAt: string;
    preparingStartedAt?: string;
    readyAt?: string;
    collectedAt?: string;
}

export interface Event {
    _id: string;
    name: string;
    description?: string;
    eventDate: string;
    createdAt: string;
    updatedAt: string;
}
