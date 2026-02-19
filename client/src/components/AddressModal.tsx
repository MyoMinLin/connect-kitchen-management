import React from 'react';
import './AddressModal.css';

interface AddressModalProps {
    address: string;
    onClose: () => void;
}

const AddressModal: React.FC<AddressModalProps> = ({ address, onClose }) => {
    return (
        <div className="address-modal-overlay" onClick={onClose}>
            <div className="address-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="address-modal-header">
                    <h2>Delivery Address</h2>
                    <button className="close-modal-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="address-content">
                    {address ? (
                        <p>{address}</p>
                    ) : (
                        <p className="no-address">No address provided.</p>
                    )}
                </div>
                <div className="address-modal-footer">
                    <button className="close-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default AddressModal;
