import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MenuItem, OrderItem } from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import toast from 'react-hot-toast';
import './OrderForm.css'; // Reuse styles but we'll add some specific ones if needed

interface PreOrderFormProps {
    eventId?: string;
    onSubmit: (order: { 
        eventId: string; 
        customerName: string; 
        items: OrderItem[]; 
        isPreOrder: boolean; 
        isPaid: boolean; 
        deliveryAddress?: string;
        deliveryType?: 'Yamato' | 'Letter Pack' | '';
        paymentProof?: string;
    }) => Promise<void>;
    onBack?: () => void;
}

const PreOrderForm: React.FC<PreOrderFormProps> = ({ eventId, onSubmit, onBack }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [customerName, setCustomerName] = useState<string>('');
    const [isDelivery, setIsDelivery] = useState<boolean>(false);
    const [deliveryAddress, setDeliveryAddress] = useState<string>('');
    const [deliveryType, setDeliveryType] = useState<'Yamato' | 'Letter Pack' | ''>('');
    const [isPaid] = useState<boolean>(false);
    const [paymentProof] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    
    const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
    const [menuSearch, setMenuSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'details' | 'menu'>('details');
    
    const nameRef = useRef<HTMLInputElement>(null);
    const addressRef = useRef<HTMLTextAreaElement>(null);
    const typeRef = useRef<HTMLSelectElement>(null);
    const proofRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    useEffect(() => {
        if (eventId) {
            fetch(`${API_BASE_URL}/api/menu-items/public/event/${eventId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.message) throw new Error(data.message);
                    setMenuItems(data.filter((item: MenuItem) => !item.isDeleted));
                })
                .catch(err => console.error("Failed to fetch menu items:", err));
        }
    }, [eventId]);

    const handleAddItem = (menuItemId: string) => {
        setCurrentOrderItems(prev => {
            const existingIndex = prev.findIndex(i => i.menuItem === menuItemId);
            if (existingIndex !== -1) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
                return updated;
            }
            return [...prev, { menuItem: menuItemId, quantity: 1, remarks: '' }];
        });
        if (window.innerWidth < 768) setActiveTab('details');
    };

    const handleRemoveItem = (index: number) => {
        setCurrentOrderItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleQuantityChange = (index: number, qty: number) => {
        if (qty < 1) {
            handleRemoveItem(index);
            return;
        }
        setCurrentOrderItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
    };

    const handleRemarkChange = (index: number, remark: string) => {
        setCurrentOrderItems(prev => prev.map((item, i) => i === index ? { ...item, remarks: remark } : item));
    };

    const getMenuItem = (menuItemId: string): MenuItem | undefined => {
        return menuItems.find(mi => mi._id === menuItemId);
    };

    const calculateTotal = () => {
        return currentOrderItems.reduce((total, item) => {
            const mi = getMenuItem(item.menuItem);
            return mi ? total + (mi.price * item.quantity) : total;
        }, 0);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
        toast.success('Payment proof selected');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventId) {
            toast.error('Event ID is missing.');
            return;
        }
        if (!customerName.trim()) {
            toast.error('Customer name is mandatory');
            setActiveTab('details');
            setTimeout(() => nameRef.current?.focus(), 100);
            return;
        }
        if (currentOrderItems.length === 0) {
            toast.error('At least one item must be selected');
            setActiveTab('menu');
            return;
        }
        if (isDelivery) {
            if (!deliveryAddress.trim()) {
                toast.error('Delivery address is mandatory');
                setActiveTab('details');
                setTimeout(() => addressRef.current?.focus(), 100);
                return;
            }
            if (!deliveryType) {
                toast.error('Delivery type is mandatory');
                setActiveTab('details');
                setTimeout(() => typeRef.current?.focus(), 100);
                return;
            }
        }
        if (isPaid && !selectedFile && !paymentProof) {
            toast.error('Payment proof attachment is mandatory');
            setActiveTab('details');
            setTimeout(() => proofRef.current?.focus(), 100);
            return;
        }

        if (isSubmitting || isUploading) return;

        try {
            setIsSubmitting(true);
            
            let finalPaymentProof = paymentProof;
            if (selectedFile) {
                setIsUploading(true);
                const formData = new FormData();
                formData.append('image', selectedFile);

                const uploadRes = await fetch(`${API_BASE_URL}/api/upload?type=payment`, {
                    method: 'POST',
                    body: formData,
                });
                
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok || !uploadData.url) {
                    throw new Error(uploadData.message || 'Payment proof upload failed');
                }
                finalPaymentProof = uploadData.url;
                setIsUploading(false);
            }

            await onSubmit({
                eventId,
                customerName: customerName.trim(),
                items: currentOrderItems,
                isPreOrder: true,
                isPaid: false, // Always false on submission, requires verification
                deliveryAddress: isDelivery ? deliveryAddress : '',
                deliveryType: isDelivery ? deliveryType : '',
                paymentProof: finalPaymentProof,
            });

            // Parent handles success state and navigation
        } catch (error) {
            console.error('Error submitting pre-order:', error);
            toast.error('Failed to submit pre-order.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredMenuItems = menuItems.filter(mi =>
        mi.name.toLowerCase().includes(menuSearch.toLowerCase())
    );

    const totalItems = currentOrderItems.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="order-form-container pre-order-form">
            <div className="of-sheet">
                <div className="of-header">
                    <div className="of-header-left">
                        <span className="of-title">{t('preOrderForm.title')}</span>
                    </div>
                </div>

                <div className="of-tabs">
                    <button
                        className={`of-tab ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        {t('orderForm.yourDetails')}
                        {totalItems > 0 && <span className="of-tab-badge">{totalItems}</span>}
                    </button>
                    <button
                        className={`of-tab ${activeTab === 'menu' ? 'active' : ''}`}
                        onClick={() => setActiveTab('menu')}
                    >
                        {t('orderForm.selectItems')}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="of-body">
                    <div className="of-columns">
                        <div className={`of-panel of-panel-details ${activeTab === 'details' ? 'of-panel-active' : ''}`}>
                            <div className="of-panel-details-inner">
                                <section className="of-section">
                                    <h3 className="of-section-title">{t('orderForm.contactInfo')}</h3>
                                    <div className="of-field of-field-full">
                                        <label className="of-label" htmlFor="customer">{t('orderForm.fullName')}</label>
                                        <input
                                            id="customer"
                                            className="of-input"
                                            type="text"
                                            value={customerName}
                                            onChange={e => setCustomerName(e.target.value)}
                                            placeholder={t('orderForm.enterName')}
                                            ref={nameRef}
                                        />
                                    </div>

                                    <div className="of-toggles">
                                        <label className="of-toggle-row">
                                            <span className="of-toggle-label">
                                                <span className="of-toggle-icon">🚚</span>
                                                {t('orderForm.delivery')}
                                            </span>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={isDelivery}
                                                className={`of-switch ${isDelivery ? 'on' : ''}`}
                                                onClick={() => setIsDelivery(v => !v)}
                                            >
                                                <span className="of-switch-thumb" />
                                            </button>
                                        </label>
                                    </div>

                                    {isDelivery && (
                                        <div className="of-slide-in">
                                            <div className="of-field of-field-full" style={{ marginTop: '1rem' }}>
                                                <label className="of-label" htmlFor="address">{t('orderForm.deliveryAddress')}</label>
                                                <textarea
                                                    id="address"
                                                    className="of-input"
                                                    value={deliveryAddress}
                                                    onChange={e => setDeliveryAddress(e.target.value)}
                                                    ref={addressRef}
                                                    placeholder={t('orderForm.fullAddress')}
                                                    style={{ height: '80px', paddingTop: '8px' }}
                                                />
                                            </div>
                                            <div className="of-field of-field-full">
                                                <label className="of-label">{t('orderForm.deliveryType')}</label>
                                                <select 
                                                    className="of-input" 
                                                    ref={typeRef}
                                                    value={deliveryType} 
                                                    onChange={e => setDeliveryType(e.target.value as any)}
                                                >
                                                    <option value="">{t('orderForm.selectType')}</option>
                                                    <option value="Yamato">{t('orderForm.yamato')}</option>
                                                    <option value="Letter Pack">{t('orderForm.letterPack')}</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className="of-field of-field-full" style={{ marginTop: '1.5rem', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                        <label className="of-label" style={{ marginBottom: '8px' }}>
                                            <span style={{ marginRight: '6px' }}>💳</span>
                                            {t('orderForm.paymentProof')}
                                        </label>
                                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
                                            {t('orderForm.paymentProofHelp')}
                                        </p>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            ref={proofRef}
                                            onChange={handleFileUpload}
                                            className="of-input"
                                            style={{ padding: '8px' }}
                                        />
                                        {isUploading && <p className="upload-hint">{t('orderForm.uploadingProof')}</p>}
                                        {(previewUrl || paymentProof) && (
                                            <div className="proof-preview" style={{ marginTop: '12px' }}>
                                                <img src={previewUrl || paymentProof} alt="Proof" style={{ width: '100%', maxWidth: '200px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className="of-section of-items-section">
                                    <div className="of-section-header">
                                        <h3 className="of-section-title">{t('orderForm.selectedItems')}</h3>
                                        <button type="button" className="of-add-more-btn" onClick={() => setActiveTab('menu')}>{t('orderForm.addItems')}</button>
                                    </div>

                                    {currentOrderItems.length === 0 ? (
                                        <div className="of-empty-items">
                                            <span className="of-empty-icon">🛒</span>
                                            <p>{t('orderForm.cartEmpty')}</p>
                                        </div>
                                    ) : (
                                        <ul className="of-items-list">
                                            {currentOrderItems.map((item, index) => {
                                                const mi = getMenuItem(item.menuItem);
                                                return (
                                                    <li key={index} className="of-item-card">
                                                        <div className="of-item-top">
                                                            <span className="of-item-name">{mi ? mi.name : t('orderForm.unknownItem')}</span>
                                                            <div className="of-item-right">
                                                                {mi && <span className="of-item-price">¥{(mi.price * item.quantity).toLocaleString()}</span>}
                                                                <button type="button" className="of-remove-btn" onClick={() => handleRemoveItem(index)}>✕</button>
                                                            </div>
                                                        </div>
                                                        <div className="of-item-bottom">
                                                            <div className="of-qty-control">
                                                                <button type="button" className="of-qty-btn" onClick={() => handleQuantityChange(index, item.quantity - 1)}>−</button>
                                                                <span className="of-qty-num">{item.quantity}</span>
                                                                <button type="button" className="of-qty-btn" onClick={() => handleQuantityChange(index, item.quantity + 1)}>+</button>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                className="of-remark-input"
                                                                placeholder={t('orderForm.noteToKitchen')}
                                                                value={item.remarks}
                                                                onChange={e => handleRemarkChange(index, e.target.value)}
                                                            />
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}

                                    {currentOrderItems.length > 0 && (
                                        <div className="of-total-row">
                                            <span>{t('common.total')}</span>
                                            <span className="of-total-amount">¥{calculateTotal().toLocaleString()}</span>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>

                        <div className={`of-panel of-panel-menu ${activeTab === 'menu' ? 'of-panel-active' : ''}`}>
                            <section className="of-menu-section">
                                <div className="of-menu-search-wrap">
                                    <input
                                        className="of-menu-search"
                                        type="text"
                                        placeholder={t('orderForm.searchProducts')}
                                        value={menuSearch}
                                        onChange={e => setMenuSearch(e.target.value)}
                                    />
                                </div>
                                <div className="of-menu-grid">
                                    {filteredMenuItems.map(item => {
                                        const inOrder = currentOrderItems.find(i => i.menuItem === item._id);
                                        return (
                                            <button
                                                type="button"
                                                key={item._id}
                                                className={`of-menu-card ${inOrder ? 'in-order' : ''}`}
                                                onClick={() => handleAddItem(item._id)}
                                            >
                                                {inOrder && <span className="of-menu-badge">{inOrder.quantity}</span>}
                                                <div className="of-menu-img-wrap">
                                                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="of-menu-img" /> : <span className="of-menu-img-placeholder">🍲</span>}
                                                </div>
                                                <span className="of-menu-name">{item.name}</span>
                                                <span className="of-menu-price">¥{item.price.toLocaleString()}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="of-footer">
                        <button 
                            type="button" 
                            className="of-btn-cancel" 
                            onClick={onBack ? onBack : () => navigate(-1)}
                        >
                            {t('common.back')}
                        </button>
                        <button type="submit" className="of-btn-submit" disabled={isSubmitting || isUploading}>
                            {isSubmitting ? t('orderForm.submitting') : t('preOrderForm.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PreOrderForm;
