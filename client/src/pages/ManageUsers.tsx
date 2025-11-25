import React from 'react';
import UserManagement from '../components/admin/UserManagement';

const ManageUsers = () => {
    return (
        <div className="container" style={{ padding: '20px' }}>
            <h1>Manage Users</h1>
            <UserManagement />
        </div>
    );
};

export default ManageUsers;
