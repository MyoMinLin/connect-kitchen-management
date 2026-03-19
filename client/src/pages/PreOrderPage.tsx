import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../hooks/useSocket';
import { API_BASE_URL } from '../utils/apiConfig';
import PreOrderForm from '../components/PreOrderForm';
import { OrderItem } from '../types';
import toast from 'react-hot-toast';
import heroImage from '../assets/preorder-hero.png';
import smallLogo from '../assets/logo.png';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './PreOrderPage.css';

const PreOrderPage: React.FC = () => {
    const { eventId: paramEventId } = useParams<{ eventId?: string }>();
    const socket = useSocket();
    const [eventId, setEventId] = useState<string | undefined>(paramEventId);
    const [showForm, setShowForm] = useState<boolean>(false);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                let currentId = eventId;
                if (!currentId) {
                    const activeRes = await fetch(`${API_BASE_URL}/api/events/public/active`);
                    if (activeRes.ok) {
                        const activeData = await activeRes.json();
                        currentId = activeData._id;
                        setEventId(currentId);
                    }
                } else {
                    // Fetch specific event name if ID was in URL
                    const res = await fetch(`${API_BASE_URL}/api/events/public/${currentId}`);
                    if (!res.ok) {
                        console.error('Event not found');
                    }
                }
            } catch (err) {
                console.error('Failed to fetch event:', err);
            }
        };
        fetchEvent();
    }, [eventId]);

    const handlePreOrder = (order: { 
        eventId: string; 
        customerName: string; 
        items: OrderItem[]; 
        isPreOrder: boolean; 
        isPaid: boolean; 
        deliveryAddress?: string;
        deliveryType?: 'Yamato' | 'Letter Pack' | '';
        paymentProof?: string;
    }) => {
        return new Promise<void>((resolve, reject) => {
            if (socket) {
                socket.emit('new_public_order', order, (response: any) => {
                    if (response?.status === 'ok') {
                        toast.success(t('preOrder.preOrderReceived'));
                        setShowForm(false); // Return to landing page
                        resolve();
                    } else {
                        reject(new Error(response?.message || 'Failed to submit pre-order'));
                    }
                });
            } else {
                reject(new Error('No server connection'));
            }
        });
    };

    return (
        <div className="pre-order-page unified-experience">
            {/* Premium Sticky Navigation */}
            <nav className="premium-nav">
                <div className="nav-content">
                    <div className="nav-logo-link">
                        <img src={smallLogo} alt="Connect Logo" className="nav-small-logo" />
                    </div>
                    <LanguageSwitcher />
                </div>
            </nav>

            <div className="pre-order-container">
                {!showForm ? (
                    <div className="landing-content">
                        {/* High-Impact Brand Banner */}
                        <section className="brand-banner-section">
                            <div className="brand-banner-card">
                                <img 
                                    src={process.env.REACT_APP_BRAND_LOGO_URL} 
                                    alt="Connect Kitchen Brand" 
                                    className="brand-banner-img" 
                                />
                            </div>
                        </section>

                        {/* Integrated Hero Section */}
                        <section className="premium-hero-card">
                            <div className="hero-visual-side">
                                <img 
                                    src={process.env.REACT_APP_PREORDER_HERO_URL || heroImage} 
                                    alt="Gourmet Experience" 
                                />
                            </div>
                            <div className="hero-content-side">
                                <h2>{t('preOrder.readyToOrder')}</h2>
                                <p>
                                    {t('preOrder.heroDescription')}
                                </p>
                                <button className="cta-button" onClick={() => setShowForm(true)}>
                                    {t('preOrder.startOrderNow')}
                                </button>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="form-view-container animate-fade-in">
                        {eventId ? (
                            <PreOrderForm 
                                eventId={eventId} 
                                onSubmit={handlePreOrder} 
                                onBack={() => setShowForm(false)}
                            />
                        ) : (
                            <div className="no-event-message card-styled">
                                <p>{t('preOrder.noActiveEvent')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreOrderPage;
