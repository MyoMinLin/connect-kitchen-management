import mongoose from 'mongoose';
import User from './models/User';
import Event from './models/Event';
import Order from './models/Order';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kitchen_management';

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected for seeding.');

        // --- Clear Old Data ---
        await Order.deleteMany({});
        console.log('Cleared existing orders.');

        // --- Seed Admin User ---
        await User.deleteOne({ username: 'admin' });
        const adminPassword = 'connectAdmin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        await User.create({
            username: 'admin',
            password: hashedPassword,
            role: 'Admin',
        });
        console.log('Admin user has been successfully created.');

        // --- Seed a Default Event ---
        await Event.deleteMany({});
        const today = new Date();
        const eventName = `Default Event ${today.getFullYear()}-${today.getMonth() + 1}`;
        await Event.create({
            name: eventName,
            description: 'A default event to get you started.',
            eventDate: today,
        });
        console.log('Default event has been created.');

    } catch (error) {
        console.error('Error seeding the database:', error);
    } finally {
        mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
};

seedDatabase();
