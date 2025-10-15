import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import dbConnect from '../utils/db';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
    }

    try {
        await dbConnect();
        const user = await User.findOne({ username }).select('+password');

        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create and sign a JWT
        const jwtSecret = process.env.JWT_SECRET;
        console.log(process.env.toString());
        if (!jwtSecret) {
            console.error('JWT_SECRET is not defined in .env file');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role,
                username: user.username
            },
        };

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '3h' }, // Token expires in 3 hours
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
