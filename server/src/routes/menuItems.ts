import express from 'express';
import MenuItem from '../models/MenuItem';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// This router will handle all /api/menu-items requests

// GET /api/menu-items/event/:eventId - Get all menu items for a specific event (for Waitstaff/Kitchen/Admin)
router.get('/event/:eventId', protect, authorize('Admin', 'Waiter', 'Kitchen'), async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ eventId: req.params.eventId, isDeleted: false });
        res.json(menuItems);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Protect all management routes, only for Admins
router.use(protect, authorize('Admin'));

// POST /api/menu-items - Create a menu item
router.post('/', async (req, res) => {
    try {
        const newItem = new MenuItem(req.body);
        const item = await newItem.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ message: 'Invalid data' });
    }
});

// PUT /api/menu-items/:id - Update a menu item
router.put('/:id', async (req, res) => {
    try {
        const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json(item);
    } catch (error) {
        res.status(400).json({ message: 'Invalid data' });
    }
});

// DELETE /api/menu-items/:id - Soft delete a menu item
router.delete('/:id', async (req, res) => {
    try {
        const item = await MenuItem.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
        if (!item) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json({ message: 'Menu item deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
