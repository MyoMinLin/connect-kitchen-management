import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import WaitstaffPage from './pages/WaitstaffPage';
import KitchenPage from './pages/KitchenPage';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AdminPage from './pages/AdminPage';
import MenuManagementPage from './pages/MenuManagementPage';
import AllOrdersPage from './pages/AllOrdersPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <MainApp />
            </Router>
        </AuthProvider>
    );
}

const MainApp = () => {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // New state for mobile menu

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
    };

    return (
        <div>
            {user && (
                <nav className="navbar">
                    <div className="container">
                        <Link to={getHomeRoute()} className="nav-brand">Connect Kitchen</Link>
                        <button className="hamburger-menu" onClick={toggleMobileMenu}>
                            <span className="bar"></span>
                            <span className="bar"></span>
                            <span className="bar"></span>
                        </button>
                        <div className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}> {/* Add 'open' class */}
                            {(user.role === 'Admin' || user.role === 'Waiter') && <Link to="/" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>New Order</Link>}
                            {(user.role === 'Admin' || user.role === 'Waiter') && <Link to="/orders" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>All Orders</Link>}
                            {(user.role === 'Admin' || user.role === 'Kitchen') && <Link to="/kds" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>Kitchen Display</Link>}
                            {user.role === 'Admin' && <Link to="/admin" className="nav-link" onClick={() => setIsMobileMenuOpen(false)}>Admin</Link>}
                            <button onClick={logout} className="nav-link logout-btn">Logout</button>
                        </div>
                    </div>
                </nav>
            )}

            <div className="container">
                <Routes>
                    <Route
                        path="/login"
                        element={user ? <Navigate to={getHomeRoute()} replace /> : <LoginPage />}
                    />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />

                    <Route element={<ProtectedRoute allowedRoles={['Admin', 'Waiter']} />}>
                        <Route path="/" element={<WaitstaffPage />} />
                        <Route path="/orders" element={<AllOrdersPage />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={['Admin', 'Kitchen']} />}>
                        <Route path="/kds" element={<KitchenPage />} />
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/admin/menu" element={<MenuManagementPage />} />
                    </Route>
                    
                    <Route path="*" element={<Navigate to={getHomeRoute()} />} />
                </Routes>
            </div>
        </div>
    );
}

export default App;
