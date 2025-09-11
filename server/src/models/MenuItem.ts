import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuItem extends Document {
    name: string;
    price: number;
    category: string;
    requiresPrep: boolean;
    eventId: mongoose.Types.ObjectId;
    isDeleted: boolean;
}

const MenuItemSchema: Schema = new Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    requiresPrep: { type: Boolean, default: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    isDeleted: { type: Boolean, default: false },
});

export default mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
