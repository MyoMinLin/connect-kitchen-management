import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import WaitstaffPage from './pages/WaitstaffPage';
import KitchenPage from './pages/KitchenPage';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AdminPage from './pages/AdminPage';
import MenuManagementPage from './pages/MenuManagementPage';
import AllOrdersPage from './pages/AllOrdersPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ManageEvents from './pages/ManageEvents';
import ManageUsers from './pages/ManageUsers';
import PublicStatusPage from './pages/PublicStatusPage';
import QRMenuPage from './pages/QRMenuPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage';
import CheckoutPage from './pages/CheckoutPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import ReadyNotification from './components/ReadyNotification';
import { useSocket } from './hooks/useSocket';
import logo from './assets/logo.png';
import './App.css';

import { LoaderProvider, useLoader } from './context/LoaderContext';
import Loader from './components/Loader';
import { Toaster } from 'react-hot-toast';

const App = () => {
    return (
        <AuthProvider>
            <EventProvider>
                <NotificationProvider>
                    <LoaderProvider>
                        <Router>
                            <MainApp />
                        </Router>
                    </LoaderProvider>
                </NotificationProvider>
            </EventProvider>
        </AuthProvider>
    );
}

const MainApp = () => {
    const { user, logout } = useAuth();

    const { readyOrder, setReadyOrder } = useNotification();
    const { isLoading, showLoader, hideLoader } = useLoader();
    const socket = useSocket();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAdminExpanded, setIsAdminExpanded] = useState(false);

    useEffect(() => {
        const handleShowLoader = () => showLoader();
        const handleHideLoader = () => hideLoader();

        window.addEventListener('showLoader', handleShowLoader);
        window.addEventListener('hideLoader', handleHideLoader);

        return () => {
            window.removeEventListener('showLoader', handleShowLoader);
            window.removeEventListener('hideLoader', handleHideLoader);
        };
    }, [showLoader, hideLoader]);

    useEffect(() => {
        if (!socket) return;

        const handleReadyNotification = (data: { orderNumber: string; orderId: string; triggeredBy: string }) => {
            if (user && user.id === data.triggeredBy) {
                return; // Don't show notification to the user who triggered it
            }
            console.log('Order is ready for pickup:', data);
            setReadyOrder(data);
        };

        socket.on('order_ready_notification', handleReadyNotification);

        return () => {
            socket.off('order_ready_notification', handleReadyNotification);
        };
    }, [socket, setReadyOrder, user]);

    const handleClearNotification = () => {
        setReadyOrder(null);
    };

    const getHomeRoute = () => {
        if (!user) return '/login';
        switch (user.role) {
            case 'Admin':
                return '/admin';
            case 'Waiter':
                return '/orders';
            case 'Kitchen':
                return '/kds';
            default:
                return '/login';
        }
    }

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
        if (isMobileMenuOpen) {
            setIsAdminExpanded(false);
        }
    };

    const toggleAdminMenu = (e: React.MouseEvent) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            e.stopPropagation();
            setIsAdminExpanded(!isAdminExpanded);
        }
    };

    const closeMenu = () => {
        setIsMobileMenuOpen(false);
        setIsAdminExpanded(false);
    };

    const isPublicRoute = window.location.pathname.startsWith('/status/') || window.location.pathname.startsWith('/menu/');

    return (
        <div>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'var(--color-surface)',
                        color: 'var(--color-neutral-800)',
                        fontFamily: 'var(--font-family)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: 'var(--space-4)',
                    },
                    success: {
                        iconTheme: {
                            primary: 'var(--color-success)',
                            secondary: 'var(--color-white)',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: 'var(--color-danger)',
                            secondary: 'var(--color-white)',
                        },
                    },
                }}
            />
            {isLoading && <Loader />}
            {user && !isPublicRoute && (
                <nav className="navbar">
                    <div className="container">
                        <Link to={getHomeRoute()} className="nav-brand" onClick={closeMenu}>
                            <img src={logo} alt="Logo" className="navbar-logo" />
                            ကွန်နက် မီးဖိုချောင်
                        </Link>
                        <button className={`hamburger-menu ${isMobileMenuOpen ? 'active hidden' : ''}`} onClick={toggleMobileMenu}>
                            <span className="bar"></span>
                            <span className="bar"></span>
                            <span className="bar"></span>
                        </button>
                        <div className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
                            <div className="mobile-menu-header">
                                <Link to={getHomeRoute()} className="nav-brand" onClick={closeMenu}>
                                    <img src={logo} alt="Logo" className="navbar-logo" />
                                </Link>
                                <button className="close-menu-btn" onClick={closeMenu}>
                                    &times;
                                </button>
                            </div>
                            <div className="nav-links-inner">
                                {(user.role === 'Admin' || user.role === 'Waiter') && <Link to="/" className="nav-link" onClick={closeMenu}>အော်ဒါအသစ်</Link>}
                                {(user.role === 'Admin' || user.role === 'Waiter') && <Link to="/orders" className="nav-link" onClick={closeMenu}>အော်ဒါများ</Link>}
                                {(user.role === 'Admin' || user.role === 'Waiter') && <Link to="/checkout" className="nav-link" onClick={closeMenu}>ငွေရှင်းရန်</Link>}
                                {(user.role === 'Admin' || user.role === 'Kitchen') && <Link to="/kds" className="nav-link" onClick={closeMenu}>မီးဖိုချောင်</Link>}
                                {user.role === 'Admin' && (
                                    <div className={`dropdown ${isAdminExpanded ? 'expanded' : ''}`}>
                                        <div className="dropdown-trigger" onClick={toggleAdminMenu}>
                                            <span className="nav-link">Admin</span>
                                            <div className="chevron-icon-container">
                                                <span className="chevron-icon"></span>
                                            </div>
                                        </div>
                                        <div className={`dropdown-content ${isAdminExpanded ? 'show' : ''}`}>
                                            <Link to="/admin/menu" className="nav-link" onClick={closeMenu}>Menus</Link>
                                            <Link to="/admin/events" className="nav-link" onClick={closeMenu}>Events</Link>
                                            <Link to="/admin/users" className="nav-link" onClick={closeMenu}>Users</Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="nav-footer">
                                <span className="username-tag">{user.username}</span>
                                <button onClick={logout} className="nav-link logout-btn">Logout</button>
                            </div>
                        </div>
                    </div>
                </nav>
            )}

            {readyOrder && (
                <ReadyNotification
                    orderNumber={readyOrder.orderNumber}
                    onClear={handleClearNotification}
                />
            )}

            <Routes>
                <Route
                    path="/login"
                    element={user ? <Navigate to={getHomeRoute()} replace /> : <LoginPage />}
                />
                <Route path="/unauthorized" element={<div className="container"><UnauthorizedPage /></div>} />

                <Route element={<ProtectedRoute allowedRoles={['Admin', 'Waiter']} />}>
                    <Route path="/" element={<div className="container"><WaitstaffPage /></div>} />
                    <Route path="/orders" element={<div className="container"><AllOrdersPage /></div>} />
                    <Route path="/checkout" element={<div className="container"><CheckoutPage /></div>} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['Admin', 'Kitchen']} />}>
                    <Route path="/kds" element={<div className="container"><KitchenPage /></div>} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                    <Route path="/admin/events" element={<div className="container"><ManageEvents /></div>} />
                    <Route path="/admin" element={<div className="container"><AdminPage /></div>} />
                    <Route path="/admin/menu" element={<div className="container"><MenuManagementPage /></div>} />
                    <Route path="/admin/users" element={<div className="container"><ManageUsers /></div>} />
                </Route>

                <Route path="/status/:eventId" element={<PublicStatusPage />} />
                <Route path="/menu/:eventId" element={<QRMenuPage />} />
                <Route path="/orders/my/:eventId" element={<CustomerOrdersPage />} />

                <Route path="*" element={<Navigate to={getHomeRoute()} />} />
            </Routes>
        </div>
    );
}

export default App;
