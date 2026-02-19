
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Counter from './models/Counter';
import dbConnect from './utils/db';

dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    process.exit(1);
}


const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

const corsOptions = [
    cors({
        origin: clientUrl,
        methods: '*',
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    })
];

app.use(corsOptions);
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: clientUrl,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 4000;

// --- MongoDB Connection ---
dbConnect();

import MenuItem from './models/MenuItem';
import Order from './models/Order';


import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import { protect, authorize } from './middleware/auth';

import eventRoutes from './routes/events';
import menuItemRoutes from './routes/menuItems';
import orderRoutes from './routes/orders';
import reportRoutes from './routes/reports';

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/orders/last', protect, authorize('Admin', 'Waiter'), async (req, res) => {
    try {
        await dbConnect();
        const lastOrder = await Order.findOne().sort({ createdAt: -1 });
        if (lastOrder) {
            res.json({ orderNumber: lastOrder.orderNumber });
        } else {
            res.json({ orderNumber: '' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching last order' });
    }
});



import { UserRole } from './models/User';

async function getNextOrderNumber() {
    await dbConnect();
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const monthString = month < 10 ? '0' + month : month.toString();
    const counterId = `CN${year}${monthString}`;

    const counter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const orderNumber = counterId + counter.seq.toString().padStart(3, '0');
    return orderNumber;
}

// --- Socket.IO Authentication Middleware ---

io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return next(new Error('Authentication error: Server configuration issue'));
        }

        const decoded = jwt.verify(token, jwtSecret) as { user: { id: string; role: UserRole; username: string } };
        (socket as any).user = decoded.user; // Attach user to the socket object
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
});


// --- Socket.IO Logic ---
io.on('connection', async (socket) => {
    console.log('A user connected:', socket.id, 'as', (socket as any).user.username);

    // Join rooms based on role
    const userRole = (socket as any).user.role;
    socket.join(userRole); // Waiter, Kitchen, Admin

    // Send all current orders to the newly connected client
    await dbConnect();
    try {
        const orders = await Order.find({ isActive: true }).populate('items.menuItem', 'name price');
        socket.emit('initial_orders', orders);
    } catch (error) {
        console.error('Error fetching initial orders:', error);
        socket.emit('error', { message: 'Failed to fetch initial orders' });
    }

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    // Listen for a new order from the waitstaff client
    socket.on('new_order', async (orderData, callback) => {
        const user = (socket as any).user;
        if (user.role !== 'Admin' && user.role !== 'Waiter') {
            if (typeof callback === 'function') {
                return callback({ status: 'error', message: 'Unauthorized' });
            }
            return socket.emit('error', { message: 'Unauthorized' });
        }

        try {
            await dbConnect();
            const orderNumber = await getNextOrderNumber();
            const newOrder = new Order({
                ...orderData,
                orderNumber,
                status: 'New',
            });
            console.log('New order:', newOrder);
            await newOrder.save();
            const populatedOrder = await Order.findById(newOrder._id).populate('items.menuItem');

            // Broadcast the new order to all clients (especially the KDS)
            io.emit('order_update', populatedOrder);

            if (typeof callback === 'function') {
                callback({ status: 'ok', order: populatedOrder });
            }
        } catch (error) {
            console.error('Error creating new order:', error);
            if (typeof callback === 'function') {
                callback({ status: 'error', message: 'Failed to create order' });
            } else {
                socket.emit('error', { message: 'Failed to create order' });
            }
        }
    });


    // Listen for an order edit from waitstaff/admin
    socket.on('edit_order', async (editData, callback) => {
        const user = (socket as any).user;
        if (user.role !== 'Admin' && user.role !== 'Waiter') {
            if (typeof callback === 'function') {
                return callback({ status: 'error', message: 'Unauthorized' });
            }
            return socket.emit('error', { message: 'Unauthorized' });
        }

        try {
            await dbConnect();
            const { orderId, tableNumber, customerName, items, isPreOrder, isPaid, deliveryAddress } = editData;

            // Prevent editing Collected orders
            const existingOrder = await Order.findById(orderId);
            if (!existingOrder) {
                if (typeof callback === 'function') {
                    return callback({ status: 'error', message: 'Order not found' });
                }
                return socket.emit('error', { message: 'Order not found' });
            }
            if (existingOrder.status === 'Collected') {
                if (typeof callback === 'function') {
                    return callback({ status: 'error', message: 'Cannot edit a Collected order' });
                }
                return socket.emit('error', { message: 'Cannot edit a Collected order' });
            }

            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                { tableNumber, customerName, items, isPreOrder, isPaid, deliveryAddress },
                { new: true }
            ).populate('items.menuItem');

            if (updatedOrder) {
                io.emit('order_update', updatedOrder);
                if (typeof callback === 'function') {
                    callback({ status: 'ok', order: updatedOrder });
                }
            }
        } catch (error) {
            console.error('Error editing order:', error);
            if (typeof callback === 'function') {
                callback({ status: 'error', message: 'Failed to edit order' });
            } else {
                socket.emit('error', { message: 'Failed to edit order' });
            }
        }
    });

    // Listen for a status update from the KDS client
    socket.on('update_order_status', async ({ orderId, status }) => {
        const user = (socket as any).user;
        const allowedUpdate =
            (user.role === 'Admin') ||
            (user.role === 'Kitchen' && (status === 'Preparing' || status === 'Ready')) ||
            (user.role === 'Waiter' && status === 'Collected');

        if (!allowedUpdate) {
            return socket.emit('error', { message: 'Unauthorized to update to this status' });
        }

        try {
            await dbConnect();
            const update: any = { status };
            if (status === 'Preparing') {
                update.preparingStartedAt = new Date();
            } else if (status === 'Ready') {
                update.readyAt = new Date();
            } else if (status === 'Collected') {
                update.collectedAt = new Date();
            }

            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                update,
                { new: true }
            ).populate('items.menuItem');

            if (updatedOrder) {
                // Broadcast the updated order to all clients
                io.emit('order_update', updatedOrder);

                // If the order is ready, send a specific notification to Waiters and Admins
                if (status === 'Ready') {
                    io.to('Waiter').to('Admin').emit('order_ready_notification', {
                        orderNumber: updatedOrder.orderNumber,
                        orderId: updatedOrder._id,
                        triggeredBy: user.id // Add the user who triggered the event
                    });
                }
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            socket.emit('error', { message: 'Failed to update order status' });
        }
    });

    // Listen for a delete order event
    socket.on('delete_order', async (orderId: string) => {
        const user = (socket as any).user;
        if (user.role !== 'Admin') {
            return socket.emit('error', { message: 'Unauthorized' });
        }

        try {
            await dbConnect();
            await Order.findByIdAndUpdate(orderId, { isActive: false });
            io.emit('order_deleted', orderId); // Notify clients to remove the order
        } catch (error) {
            console.error('Error deleting order:', error);
            socket.emit('error', { message: 'Failed to delete order' });
        }
    });
});


server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
