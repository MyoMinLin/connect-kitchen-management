import React, { useState, useRef } from 'react';
import './ReceiptModal.css';

interface ReceiptModalProps {
    imageUrl: string;
    onClose: () => void;
    onVerify?: () => void;
    isPaid?: boolean;
    orderNumber?: string;
    customerName?: string;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ 
    imageUrl, 
    onClose, 
    onVerify, 
    isPaid, 
    orderNumber, 
    customerName 
}) => {
    const [scale, setScale] = useState(1);
    const [isVerifying, setIsVerifying] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => setScale(1);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setScale(prev => Math.min(Math.max(prev + delta, 0.5), 3));
        }
    };

    const handleVerify = async () => {
        if (!onVerify || isVerifying) return;
        try {
            setIsVerifying(true);
            await onVerify();
            // Modal is usually closed by parent after order_update, 
            // but we call onClose here if it's a local state change
            onClose();
        } catch (error) {
            console.error('Verification failed:', error);
            setIsVerifying(false);
        }
    };

    return (
        <div className="receipt-modal-overlay" onClick={onClose}>
            <div className="receipt-modal-content" onClick={e => e.stopPropagation()}>
                <div className="receipt-modal-header">
                    <div className="receipt-modal-info">
                        <span className="receipt-order-num">Order #{orderNumber}</span>
                        {customerName && <span className="receipt-customer-name">👤 {customerName}</span>}
                    </div>
                    
                    <div className="receipt-modal-header-actions">
                        <div className="receipt-zoom-controls">
                            <button className="receipt-zoom-btn" onClick={handleZoomIn} title="Zoom In" disabled={scale >= 3}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                            <span className="receipt-zoom-level" onClick={handleResetZoom} title="Reset Zoom">
                                {Math.round(scale * 100)}%
                            </span>
                            <button className="receipt-zoom-btn" onClick={handleZoomOut} title="Zoom Out" disabled={scale <= 0.5}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        </div>
                        <button className="receipt-modal-close" onClick={onClose}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <div 
                    className="receipt-modal-image-container" 
                    onWheel={handleWheel}
                    ref={containerRef}
                >
                    <img 
                        src={imageUrl} 
                        alt="Payment Receipt" 
                        className="receipt-modal-img" 
                        style={{ 
                            transform: `scale(${scale})`,
                            cursor: scale > 1 ? 'grab' : 'default'
                        }}
                    />
                </div>

                <div className="receipt-modal-footer">
                    <div className="receipt-modal-actions">
                        {!isPaid && onVerify && (
                            <button 
                                className={`receipt-modal-verify-btn ${isVerifying ? 'verifying' : ''}`} 
                                onClick={handleVerify}
                                disabled={isVerifying}
                            >
                                {isVerifying ? (
                                    <>
                                        <span className="receipt-button-spinner" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                        Verify Payment
                                    </>
                                )}
                            </button>
                        )}
                        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="receipt-modal-download">
                            Open in New Tab
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
