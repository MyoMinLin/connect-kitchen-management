import mongoose, { Document, Schema } from 'mongoose';
import { IMenuItem } from './MenuItem';

export interface IOrder extends Document {
    orderNumber: string;
    isPreOrder: boolean;
    items: { menuItem: IMenuItem['_id']; quantity: number }[];
    status: 'New' | 'Preparing' | 'Ready' | 'Collected';
    preparingStartedAt?: Date;
    readyAt?: Date;
    collectedAt?: Date;
    isActive: boolean;
}

const OrderSchema: Schema = new Schema({
    orderNumber: { type: String, unique: true },
    isPreOrder: { type: Boolean, default: false },
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

