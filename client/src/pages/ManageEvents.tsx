import React from 'react';
import EventManagement from '../components/admin/EventManagement';

const ManageEvents = () => {
    return (
        <div className="container">
            <div style={{ padding: '1rem 0' }}>
                <h1 style={{ marginBottom: '1.5rem' }}>Manage Events</h1>
                <EventManagement />
            </div>
        </div>
    );
};

export default ManageEvents;
