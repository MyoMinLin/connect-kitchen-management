import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'Admin' | 'Kitchen' | 'Waiter';

export interface IUser extends Document {
    username: string;
    password?: string; // Password will be selected off by default
    role: UserRole;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false }, // select: false means it won't be returned in queries by default
    role: {
        type: String,
        enum: ['Admin', 'Kitchen', 'Waiter'],
        required: true,
    },
});

export default mongoose.model<IUser>('User', UserSchema);
