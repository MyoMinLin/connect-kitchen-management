export interface MenuItem {
    _id: string;
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
    description?: string;
    options?: {
        name: string;
        choices: { name: string; priceAdjustment?: number }[];
    }[];
    requiresPrep: boolean;
    isDeleted?: boolean;
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
    deliveryType?: 'Yamato' | 'Letter Pack' | '';
    paymentProof?: string;
    seatNumber?: string;
    customerName?: string;
    tabId?: string; // Unique ID to group orders by customer session
    items: {
        menuItem: MenuItem; // Use MenuItem interface
        quantity: number;
        remarks?: string;
    }[];
    status: 'New' | 'Preparing' | 'Ready' | 'Collected' | 'Cancelled';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    preparingStartedAt?: string;
    readyAt?: string;
    collectedAt?: string;
    cancelledAt?: string;
}

export interface Event {
    _id: string;
    name: string;
    description?: string;
    eventDate: string;
    createdAt: string;
    updatedAt: string;
}
