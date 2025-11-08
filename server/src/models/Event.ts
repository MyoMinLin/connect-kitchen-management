import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
    name: string;
    description?: string;
    eventDate: Date;
    IsCurrentEvent: boolean;
}

const EventSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    eventDate: { type: Date, required: true },
    IsCurrentEvent: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IEvent>('Event', EventSchema);
