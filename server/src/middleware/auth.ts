import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';

// Define a custom request type to include the user payload
export interface AuthRequest extends Request {
    user?: { id: string; role: UserRole; username: string };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not defined');
        }

        const decoded = jwt.verify(token, jwtSecret) as { user: { id: string; role: UserRole; username: string } };
        req.user = decoded.user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

export const authorize = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `User role ${req.user?.role} is not authorized to access this route` });
        }
        next();
    };
};
