import React from 'react';
import SeatManagement from '../components/admin/SeatManagement';

const ManageSeats = () => {
    return (
        <div className="container">
            <div style={{ padding: '1rem 0' }}>
                <h1 style={{ marginBottom: '1.5rem' }}>Manage Seats & QRs</h1>
                <SeatManagement />
            </div>
        </div>
    );
};

export default ManageSeats;
