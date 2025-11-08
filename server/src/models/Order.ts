import mongoose, { Document, Schema } from 'mongoose';
import { IMenuItem } from './MenuItem';
import { IEvent } from './Event';

export interface IOrder extends Document {
    eventId: mongoose.Types.ObjectId;
    orderNumber: string;
    tableNumber?: string;
    isPreOrder: boolean;
    isPaid: boolean;
    deliveryAddress: string;
    items: { menuItem: IMenuItem['_id']; quantity: number }[];
    status: 'New' | 'Preparing' | 'Ready' | 'Collected';
    preparingStartedAt?: Date;
    readyAt?: Date;
    collectedAt?: Date;
    isActive: boolean;
}

const OrderSchema: Schema = new Schema({
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true }, // Renamed from 'event' to 'eventId'
    orderNumber: { type: String, unique: true },
    tableNumber: { type: String },
    isPreOrder: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    deliveryAddress: { type: String },
    customerName: { type: String }, // New field for customer name
    items: [{
        menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true },
        remarks: { type: String }, // Added remarks
    }],
    status: {
        type: String,
        enum: ['New', 'Preparing', 'Ready', 'Collected'],
        default: 'New',
    },
    preparingStartedAt: { type: Date },
    readyAt: { type: Date },
    collectedAt: { type: Date },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);