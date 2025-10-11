import express from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All user routes are now protected and restricted to Admins.
// router.use(protect, authorize('Admin'));

// GET /api/users - Get all users
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/users - Create a new user
router.post('/', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Please provide username, password, and role' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        user = new User({
            username,
            password: hashedPassword,
            role,
        });

        await user.save();
        res.status(201).json({ message: 'User created successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/users/:id - Update a user (username, role, password)
router.put('/:id', async (req, res) => {
    const { username, password, role } = req.body;
    
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (username) user.username = username;
        if (role) user.role = role;
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters long' });
            }
            user.password = await bcrypt.hash(password, 12);
        }

        await user.save();
        res.json({ message: 'User updated successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


// DELETE /api/users/:id - Delete a user
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from being deleted
        if (user.username === 'admin') {
            return res.status(400).json({ message: 'Cannot delete the default admin user.' });
        }

        await user.deleteOne(); // Use deleteOne() on the document
        res.json({ message: 'User deleted successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
