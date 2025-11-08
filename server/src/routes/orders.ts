import express from 'express';
import Order from '../models/Order';
import { protect, authorize } from '../middleware/auth';
import dbConnect from '../utils/db';

const router = express.Router();

// GET /api/orders/event/:eventId - Get all orders for a specific event (protected)
router.get('/event/:eventId', protect, async (req, res) => {
    try {
        await dbConnect();
        const { eventId } = req.params;

        const orders = await Order.find({ eventId: eventId })
            .populate('items.menuItem')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/orders - Create a new order (for Waiter and Admin)
router.post('/', protect, authorize('Admin', 'Waiter'), async (req, res) => {
    try {
        await dbConnect();
        const newOrder = new Order(req.body);
        const savedOrder = await newOrder.save();
        
        // Populate menuItem details before sending response
        const populatedOrder = await Order.findById(savedOrder._id).populate('items.menuItem');
        
        res.status(201).json(populatedOrder);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid data' });
    }
});

export default router;
