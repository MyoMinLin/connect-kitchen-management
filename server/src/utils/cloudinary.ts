import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: async (req: any, file: any) => {
            if (req.query.type === 'payment') {
                return process.env.CLOUDINARY_PAYMENT_FOLDER || 'payment-receipts';
            }
            return process.env.CLOUDINARY_MENU_FOLDER || 'menu-items';
        },
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [{ width: 600, height: 600, crop: 'limit', quality: 'auto' }],
    } as any,
});

export default cloudinary;
