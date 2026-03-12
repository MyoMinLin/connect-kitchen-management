import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { storage } from '../utils/cloudinary';

const router = express.Router();
const upload = multer({ storage }).single('image');

// POST /api/upload - Upload a single image to Cloudinary
router.post('/', (req: Request, res: Response, next: NextFunction) => {
    upload(req, res, (err: any) => {
        if (err) {
            console.error('Multer/Cloudinary Upload Error:', err);
            return res.status(500).json({ 
                message: 'Image upload failed', 
                error: err.message || 'Unknown error' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        try {
            // multer-storage-cloudinary attaches .path (secure URL)
            const imageUrl = (req.file as any).path;
            res.json({ url: imageUrl });
        } catch (error) {
            console.error('Finalizing upload error:', error);
            res.status(500).json({ message: 'Error processing uploaded file' });
        }
    });
});

export default router;
