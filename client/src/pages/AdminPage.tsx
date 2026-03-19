import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import EventSalesChart from '../components/admin/EventSalesChart';
import PopularDishesChart from '../components/admin/PopularDishesChart';
import EventPerformanceTable from '../components/admin/EventPerformanceTable';
import { API_BASE_URL } from '../utils/apiConfig';
import './AdminPage.css';

interface ReportData {
    eventSales: Array<{
        eventName: string;
        totalSales: number;
    }>;
    popularDishes: Array<{
        dishName: string;
        orderCount: number;
    }>;
    popularDishesByEvent: Array<{
        eventId: string;
        eventName: string;
        dishes: Array<{
            dishName: string;
            orderCount: number;
        }>;
    }>;
    eventPerformance: Array<{
        eventName: string;
        eventDate: Date;
        totalOrders: number;
        totalSales: number;
        status: string;
    }>;
}

const AdminPage = () => {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE_URL}/api/reports/dashboard`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch reports');
                }

                const data = await response.json();
                setReportData(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching reports:', err);
                setError(t('admin.failedToLoad'));
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div>
            <h1>{t('admin.dashboard')}</h1>

            {/* Reports Section */}
            <div className="reports-section">
                <h2 className="section-title">{t('admin.reportsAndAnalytics')}</h2>
                {loading && <p className="loading-message">{t('admin.loadingReports')}</p>}
                {error && <p className="error-message">{error}</p>}
                {!loading && !error && reportData && (
                    <div className="reports-grid">
                        <EventSalesChart data={reportData.eventSales} />
                        <PopularDishesChart
                            allTimeData={reportData.popularDishes}
                            byEventData={reportData.popularDishesByEvent}
                        />
                        <EventPerformanceTable data={reportData.eventPerformance} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;
