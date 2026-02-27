import mongoose, { Document, Schema } from 'mongoose';
import { IMenuItem } from './MenuItem';
import { IEvent } from './Event';

export interface IOrder extends Document {
    eventId: mongoose.Types.ObjectId;
    orderNumber: string;
    tableNumber?: string;
    customerName?: string; // Add to interface
    tabId?: string; // Unique ID to group orders by customer session
    isPreOrder: boolean;
    isPaid: boolean;
    deliveryAddress: string;
    items: { menuItem: IMenuItem['_id']; quantity: number; remarks?: string }[];
    status: 'New' | 'Preparing' | 'Ready' | 'Collected' | 'Cancelled';
    preparingStartedAt?: Date;
    readyAt?: Date;
    collectedAt?: Date;
    cancelledAt?: Date;
    isActive: boolean;
}

const OrderSchema: Schema = new Schema({
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    orderNumber: { type: String, unique: true },
    tableNumber: { type: String },
    customerName: { type: String },
    tabId: { type: String }, // New field for grouping orders
    isPreOrder: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    deliveryAddress: { type: String, default: '' },
    items: [{
        menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true },
        remarks: { type: String }
    }],
    status: {
        type: String,
        enum: ['New', 'Preparing', 'Ready', 'Collected', 'Cancelled'],
        default: 'New',
    },
    preparingStartedAt: { type: Date },
    readyAt: { type: Date },
    collectedAt: { type: Date },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);