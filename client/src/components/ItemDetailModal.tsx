import React, { useState } from 'react';
import { MenuItem } from '../types';
import './ItemDetailModal.css';

interface ItemDetailModalProps {
    item: MenuItem;
    onClose: () => void;
    onAddToCart: (item: MenuItem, quantity: number, selectedOptions: { [key: string]: string }, remarks: string) => void;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
    const [remarks, setRemarks] = useState('');

    const handleOptionChange = (optionName: string, choiceName: string) => {
        setSelectedOptions(prev => ({
            ...prev,
            [optionName]: choiceName
        }));
    };

    const handleAdd = () => {
        onAddToCart(item, quantity, selectedOptions, remarks);
        onClose();
    };

    return (
        <div className="item-detail-overlay" onClick={onClose}>
            <div className="item-detail-modal" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>

                <div className="item-image-container">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="item-detail-image" />
                    ) : (
                        <div className="idm-image-placeholder">
                            <span>📷 No Image</span>
                        </div>
                    )}
                </div>

                <div className="item-detail-content">
                    <h2 className="item-detail-name">{item.name}</h2>
                    {item.description && <p className="item-detail-description">{item.description}</p>}

                    <div className="idm-price-row">
                        <span className="idm-price">¥{item.price.toLocaleString()}</span>
                        <span className="idm-tax-label">(incl. tax)</span>
                    </div>

                    {item.options && item.options.map(option => (
                        <div key={option.name} className="option-section">
                            <h3 className="option-title">{option.name}</h3>
                            <div className="option-choices">
                                {option.choices.map(choice => (
                                    <button
                                        key={choice.name}
                                        className={`choice-button ${selectedOptions[option.name] === choice.name ? 'selected' : ''}`}
                                        onClick={() => handleOptionChange(option.name, choice.name)}
                                    >
                                        {choice.name} {choice.priceAdjustment ? `(+¥${choice.priceAdjustment})` : ''}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="remarks-section">
                        <h3 className="option-title">Remarks</h3>
                        <textarea
                            className="remarks-textarea"
                            placeholder="Add special instructions (e.g. no onions, extra spicy)"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bottom-actions">
                    <div className="quantity-selector">
                        <button className="qty-btn minus" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                        <span className="qty-display">{quantity}</span>
                        <button className="qty-btn plus" onClick={() => setQuantity(quantity + 1)}>+</button>
                    </div>
                    <button className="idm-add-btn" onClick={handleAdd}>
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailModal;
