import React from 'react';
import MenuEditor from '../components/admin/MenuEditor';

const MenuManagementPage = () => {
    return (
        <div className="container">
            <div style={{ padding: '1rem 0' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Menu Item Management</h1>
                <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>Select an event to view and manage its menu items.</p>
                <MenuEditor />
            </div>
        </div>
    );
};

export default MenuManagementPage;
