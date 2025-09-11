import React from 'react';
import MenuEditor from '../components/admin/MenuEditor';

const MenuManagementPage = () => {
    return (
        <div>
            <h1 className="page-title">Menu Item Management</h1>
            <p>Select an event to view and manage its menu items.</p>
            <MenuEditor />
        </div>
    );
};

export default MenuManagementPage;
