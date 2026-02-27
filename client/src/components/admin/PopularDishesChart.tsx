import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './PopularDishesChart.css';

interface PopularDishData {
    dishName: string;
    orderCount: number;
}

interface EventDishData {
    eventId: string;
    eventName: string;
    dishes: PopularDishData[];
}

interface PopularDishesChartProps {
    allTimeData: PopularDishData[];
    byEventData: EventDishData[];
}

const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8'];

const PopularDishesChart: React.FC<PopularDishesChartProps> = ({ allTimeData, byEventData }) => {
    const [selectedEventId, setSelectedEventId] = React.useState<string>('all');

    // Show top 10 dishes
    const topAllTimeDishes = allTimeData.slice(0, 10);

    // Get selected event dishes
    const selectedEventDishes = selectedEventId === 'all'
        ? topAllTimeDishes
        : byEventData.find(e => e.eventId === selectedEventId)?.dishes.slice(0, 10) || [];

    const displayData = selectedEventId === 'all' ? topAllTimeDishes : selectedEventDishes;
    const chartTitle = selectedEventId === 'all'
        ? 'Popular Main Dishes (All Events)'
        : `Popular Main Dishes - ${byEventData.find(e => e.eventId === selectedEventId)?.eventName || ''}`;

    return (
        <div className="popular-dishes-chart">
            <div className="chart-header">
                <h2>{chartTitle}</h2>
                <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="event-selector"
                >
                    <option value="all">All Events</option>
                    {byEventData.map(event => (
                        <option key={event.eventId} value={event.eventId}>
                            {event.eventName}
                        </option>
                    ))}
                </select>
            </div>
            {displayData.length === 0 ? (
                <p className="no-data">No dish data available</p>
            ) : (
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={displayData}
                        layout="vertical"
                        margin={window.innerWidth < 768
                            ? { top: 10, right: 20, left: 20, bottom: 0 }
                            : { top: 20, right: 30, left: 100, bottom: 5 }
                        }
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                            dataKey="dishName"
                            type="category"
                            width={window.innerWidth < 768 ? 60 : 90}
                        />
                        <Tooltip
                            formatter={(value: number) => [`${value} orders`, 'Orders']}
                            labelStyle={{ color: '#333' }}
                        />
                        <Bar dataKey="orderCount" name="Orders">
                            {displayData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

export default PopularDishesChart;
