import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './EventSalesChart.css';

interface EventSalesData {
    eventName: string;
    totalSales: number;
}

interface EventSalesChartProps {
    data: EventSalesData[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

const EventSalesChart: React.FC<EventSalesChartProps> = ({ data }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="event-sales-chart">
            <h2>Event Sales Overview</h2>
            {data.length === 0 ? (
                <p className="no-data">No sales data available</p>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={data}
                        margin={window.innerWidth < 768
                            ? { top: 10, right: 10, left: -20, bottom: 0 }
                            : { top: 20, right: 30, left: 20, bottom: 5 }
                        }
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="eventName"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                        />
                        <YAxis tickFormatter={formatCurrency} />
                        <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            labelStyle={{ color: '#333' }}
                        />
                        <Bar dataKey="totalSales" name="Total Sales">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

export default EventSalesChart;
