import React from 'react';

interface IdentityModalProps {
    customerName: string;
    setCustomerName: (name: string) => void;
    onSaveName: (name: string) => void;
}

const IdentityModal: React.FC<IdentityModalProps> = ({
    customerName,
    setCustomerName,
    onSaveName
}) => {
    return (
        <div className="name-modal-overlay">
            <div className="name-modal">
                <h3>Your Name</h3>
                <p>Please enter your name to identify your order.</p>
                <input
                    type="text"
                    placeholder="Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && customerName.trim()) {
                            onSaveName(customerName);
                        }
                    }}
                    autoFocus
                />
                <button
                    onClick={() => {
                        if (customerName.trim()) {
                            onSaveName(customerName);
                        }
                    }}
                    disabled={!customerName.trim()}
                >
                    Start Ordering
                </button>
            </div>
        </div>
    );
};

export default IdentityModal;
