export interface MenuItem {
    _id: string;
    name: string;
    price: number;
    category: string;
    requiresPrep: boolean;
}

export interface OrderItem {
    menuItem: string; // Just the ID
    quantity: number;
    remarks?: string; // Optional remarks for the item
}

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
        menuItem: MenuItem; // Use MenuItem interface
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
