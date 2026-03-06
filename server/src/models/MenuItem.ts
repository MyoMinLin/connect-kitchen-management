import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
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
    eventId: mongoose.Types.ObjectId;
    isDeleted: boolean;
}

const MenuItemSchema: Schema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    imageUrl: { type: String },
    description: { type: String },
    options: [{
        name: { type: String, required: true },
        choices: [{
            name: { type: String, required: true },
            priceAdjustment: { type: Number, default: 0 }
        }]
    }],
    requiresPrep: { type: Boolean, default: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    isDeleted: { type: Boolean, default: false },
});

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
