import React, { useState, useRef } from 'react';
import './MenuEditModal.css';

interface IMenuItem {
    _id: string;
    name: string;
    price: number;
    category: string;
    requiresPrep: boolean;
    imageUrl?: string;
}

interface MenuEditModalProps {
    item: IMenuItem;
    onClose: () => void;
    onUpdate: (itemId: string, data: any) => Promise<void>;
    uploadImage: (file: File) => Promise<string>;
}

const MenuEditModal: React.FC<MenuEditModalProps> = ({ item, onClose, onUpdate, uploadImage }) => {
    const [name, setName] = useState(item.name);
    const [price, setPrice] = useState(item.price.toString());
    const [category, setCategory] = useState(item.category);
    const [requiresPrep, setRequiresPrep] = useState(item.requiresPrep);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>(item.imageUrl || '');
    const [isUpdating, setIsUpdating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) setPrice(value);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        try {
            let imageUrl: string | undefined;
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            const updatedData: any = {
                name,
                price: parseFloat(price),
                category,
                requiresPrep,
            };
            if (imageUrl) updatedData.imageUrl = imageUrl;

            await onUpdate(item._id, updatedData);
            onClose();
        } catch (error) {
            console.error('Failed to update item:', error);
            alert('Failed to update item. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="menu-edit-overlay" onClick={onClose}>
            <div className="menu-edit-modal" onClick={e => e.stopPropagation()}>
                <div className="menu-edit-header">
                    <h2>Edit Menu Item</h2>
                    <button className="close-modal-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="menu-edit-form">
                    <div className="edit-image-section">
                        <label className="edit-image-label">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="edit-image-preview" />
                            ) : (
                                <div className="edit-image-placeholder">
                                    <span>📷 Add Image</span>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                className="edit-image-input"
                            />
                        </label>
                        {imagePreview && (
                            <button
                                type="button"
                                className="remove-image-btn"
                                onClick={() => { setImageFile(null); setImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            >
                                Remove Image
                            </button>
                        )}
                    </div>

                    <div className="edit-fields-section">
                        <div className="edit-form-group">
                            <label>Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                        </div>

                        <div className="edit-form-row">
                            <div className="edit-form-group">
                                <label>Price (¥)</label>
                                <input type="text" inputMode="decimal" value={price} onChange={handlePriceChange} required />
                            </div>
                            <div className="edit-form-group">
                                <label>Category</label>
                                <input type="text" value={category} onChange={e => setCategory(e.target.value)} required />
                            </div>
                        </div>

                        <div className="edit-form-group-checkbox">
                            <label>
                                <input type="checkbox" checked={requiresPrep} onChange={e => setRequiresPrep(e.target.checked)} />
                                Requires Prep?
                            </label>
                        </div>
                    </div>

                    <div className="edit-modal-actions">
                        <button type="button" className="edit-cancel-btn" onClick={onClose} disabled={isUpdating}>
                            Cancel
                        </button>
                        <button type="submit" className="edit-update-btn" disabled={isUpdating}>
                            {isUpdating ? 'Updating...' : 'Update Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MenuEditModal;
