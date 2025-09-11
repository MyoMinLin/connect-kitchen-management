export interface Order {
    _id: string;
    orderNumber: string;
    isPreOrder: boolean;
    tableNumber: number;
    customerName?: string;
    items: {
        menuItem: {
            _id: string;
            name: string;
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
