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

        const orders = await Order.find({ eventId: eventId, isActive: { $ne: false } })
            .populate('items.menuItem')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/orders/public/status/:eventId - Public status for dashboard (No Auth)
router.get('/public/status/:eventId', async (req, res) => {
    try {
        await dbConnect();
        const { eventId } = req.params;

        // Only return orders that are being prepared or are ready
        const orders = await Order.find({
            eventId: eventId,
            status: { $in: ['Preparing', 'Ready'] },
            isActive: { $ne: false }
        })
            .select('orderNumber customerName status updatedAt items tabId')
            .populate('items.menuItem', 'name requiresPrep');

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/orders/tab/:eventId/:identifier - Get unpaid orders for a customer tab (by name or seat)
router.get('/tab/:eventId/:identifier', async (req, res) => {
    try {
        await dbConnect();
        const { eventId, identifier } = req.params;

        const orders = await Order.find({
            eventId: eventId,
            $or: [{ customerName: identifier }, { seatNumber: identifier }],
            status: { $ne: 'Collected' },
            isActive: { $ne: false }
        }).populate('items.menuItem');

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET /api/orders/public/tab/:tabId - Publicly fetch orders by tabId
router.get('/public/tab/:tabId', async (req, res) => {
    try {
        await dbConnect();
        const { tabId } = req.params;

        const orders = await Order.find({
            tabId: tabId,
            isActive: { $ne: false }
        })
            .populate('items.menuItem')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/orders/tab/settle - Settle all orders for a customer tab (protected)
router.post('/tab/settle', protect, authorize('Admin', 'Waiter'), async (req, res) => {
    try {
        await dbConnect();
        const { eventId, identifier } = req.body;

        const result = await Order.updateMany(
            {
                eventId,
                $or: [{ customerName: identifier }, { seatNumber: identifier }],
                status: { $ne: 'Collected' },
                isActive: { $ne: false }
            },
            { $set: { status: 'Collected', collectedAt: new Date() } }
        );

        res.json({ message: `Settled ${result.modifiedCount} orders`, modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
