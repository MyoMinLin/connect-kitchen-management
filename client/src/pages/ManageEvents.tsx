import React from 'react';
import EventManagement from '../components/admin/EventManagement';

const ManageEvents = () => {
    return (
        <div className="container" style={{ padding: '20px' }}>
            <h1>Manage Events</h1>
            <EventManagement />
        </div>
    );
};

export default ManageEvents;
