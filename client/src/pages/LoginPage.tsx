import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/apiConfig';
import logo from '../assets/logo.png';
import { fetchWithLoader } from '../utils/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import './LoginPage.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        if (user) {
            switch (user.role) {
                case 'Admin':
                    navigate('/admin');
                    break;
                case 'Waiter':
                    navigate('/orders');
                    break;
                case 'Kitchen':
                    navigate('/kds');
                    break;
                default:
                    navigate('/');
                    break;
            }
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetchWithLoader(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || t('login.failedToLogin'));
            }

            login(data.token);
            navigate('/');

        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="login-container">
            <div className="login-lang-switcher">
                <LanguageSwitcher />
            </div>
            <form onSubmit={handleSubmit} className="login-form">
                <img src={logo} alt="Logo" className="login-logo" />
                <h2>{t('login.title')}</h2>
                {error && <p className="error-message">{error}</p>}
                <div className="form-group">
                    <label htmlFor="username">{t('login.username')}</label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">{t('login.password')}</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="login-btn">{t('login.loginBtn')}</button>
            </form>
        </div>
    );
};

export default LoginPage;
