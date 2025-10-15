import express from 'express';
import Event from '../models/Event';
import { protect, authorize } from '../middleware/auth';
import dbConnect from '../utils/db';

const router = express.Router();

// GET /api/events/active - Get active events for Waiter/Kitchen/Admin
router.get('/active', protect, authorize('Admin', 'Waiter', 'Kitchen'), async (req, res) => {
    try {
        await dbConnect();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const events = await Event.find({
            eventDate: { $gte: startOfMonth, $lte: endOfMonth } // Events within current month
        }).sort({ eventDate: 1 }); // Sort by date ascending

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Protect all other event routes, only for Admins
router.use(protect, authorize('Admin'));

// GET /api/events - Get all events
router.get('/', async (req, res) => {
    try {
        await dbConnect();
        const events = await Event.find().sort({ eventDate: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST /api/events - Create an event
router.post('/', async (req, res) => {
    try {
        await dbConnect();
        const newEvent = new Event(req.body);
        const event = await newEvent.save();
        res.status(201).json(event);
    } catch (error) {
        res.status(400).json({ message: 'Invalid data' });
    }
});

// PUT /api/events/:id - Update an event
router.put('/:id', async (req, res) => {
    try {
        await dbConnect();
        const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        res.status(400).json({ message: 'Invalid data' });
    }
});

// DELETE /api/events/:id - Delete an event
router.delete('/:id', async (req, res) => {
    try {
        await dbConnect();
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        await event.deleteOne();
        res.json({ message: 'Event removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
