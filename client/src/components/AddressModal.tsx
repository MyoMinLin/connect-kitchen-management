import React from 'react';
import './AddressModal.css';

interface AddressModalProps {
    address: string;
    customerName?: string;
    orderNo?: string | number;
    onClose: () => void;
}

const AddressModal: React.FC<AddressModalProps> = ({ address, customerName, orderNo, onClose }) => {
    const title = customerName && orderNo
        ? `Delivery Address of ${customerName} (${orderNo})`
        : 'Delivery Address';

    return (
        <div className="address-modal-overlay" onClick={onClose}>
            <div className="address-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="address-modal-header">
                    <h2>{title}</h2>
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
