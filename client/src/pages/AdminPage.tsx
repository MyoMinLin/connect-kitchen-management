import React from 'react';
import { Link } from 'react-router-dom';
import UserManagement from '../components/admin/UserManagement';
import './AdminPage.css';

const AdminPage = () => {
    return (
        <div>
            <h1>Admin Dashboard</h1>

            <div className="admin-dashboard-nav">
                <Link to="/" className="dashboard-link">
                    <h3>Go to Waitstaff View</h3>
                    <p>Create new orders for tables.</p>
                </Link>
                <Link to="/kds" className="dashboard-link">
                    <h3>Go to Kitchen Display</h3>
                    <p>View and manage order statuses.</p>
                </Link>
                <Link to="/admin/menu" className="dashboard-link">
                    <h3>Manage Menu Items</h3>
                    <p>Edit categories and prices for events.</p>
                </Link>
                <Link to="/admin/events" className="dashboard-link">
                    <h3>Manage Events</h3>
                    <p>Create and edit events.</p>
                </Link>
                <Link to="/admin/users" className="dashboard-link">
                    <h3>Manage Users</h3>
                    <p>Add and edit users.</p>
                </Link>
            </div>
        </div>
    );
};

export default AdminPage;
