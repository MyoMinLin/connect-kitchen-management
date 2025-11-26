import React from 'react';
import { format } from 'date-fns';
import './EventPerformanceTable.css';

interface EventPerformanceData {
    eventName: string;
    eventDate: Date;
    totalOrders: number;
    totalSales: number;
    categoryBreakdown?: Record<string, number>;
    status: string;
}

interface EventPerformanceTableProps {
    data: EventPerformanceData[];
}

const EventPerformanceTable: React.FC<EventPerformanceTableProps> = ({ data }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="event-performance-table">
            <h2>Event Performance Details</h2>
            {data.length === 0 ? (
                <p className="no-data">No event data available</p>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Event Name</th>
                                <th>Date</th>
                                <th>Total Orders</th>
                                <th>Total Sales</th>
                                <th>Category Breakdown</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((event, index) => (
                                <tr key={index}>
                                    <td>{event.eventName}</td>
                                    <td>{format(new Date(event.eventDate), 'MMM dd, yyyy')}</td>
                                    <td>{event.totalOrders}</td>
                                    <td>{formatCurrency(event.totalSales)}</td>
                                    <td>
                                        {event.categoryBreakdown ? (
                                            <div className="category-breakdown">
                                                {Object.entries(event.categoryBreakdown).map(([cat, count]) => (
                                                    <div key={cat} className="category-stat">
                                                        <span className="cat-name">{cat}:</span>
                                                        <span className="cat-count">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${event.status.toLowerCase()}`}>
                                            {event.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EventPerformanceTable;
