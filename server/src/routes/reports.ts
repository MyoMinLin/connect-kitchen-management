import express from 'express';
import Order from '../models/Order';
import MenuItem from '../models/MenuItem';
import Event from '../models/Event';
import { protect, authorize } from '../middleware/auth';
import dbConnect from '../utils/db';

const router = express.Router();

// GET /api/reports/dashboard - Get aggregated dashboard reports (Admin only)
router.get('/dashboard', protect, authorize('Admin'), async (req, res) => {
    try {
        await dbConnect();

        // Fetch all events
        const events = await Event.find().sort({ eventDate: -1 });

        // Aggregate sales and order counts per event
        const eventSalesData = await Promise.all(
            events.map(async (event) => {
                const orders = await Order.find({ eventId: event._id }).populate('items.menuItem');

                const totalOrders = orders.length;
                const totalSales = orders.reduce((sum, order) => {
                    const orderTotal = order.items.reduce((itemSum, item) => {
                        return itemSum + (item.quantity * (item.menuItem.price || 0));
                    }, 0);
                    return sum + orderTotal;
                }, 0);

                const categoryBreakdown: Record<string, number> = {};
                orders.forEach(order => {
                    order.items.forEach(item => {
                        const menuItem = item.menuItem as any;
                        if (menuItem && menuItem.category) {
                            const cat = menuItem.category;
                            categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + item.quantity;
                        }
                    });
                });

                return {
                    eventId: event._id,
                    eventName: event.name,
                    eventDate: event.eventDate,
                    totalOrders,
                    totalSales,
                    categoryBreakdown,
                    isCurrentEvent: event.IsCurrentEvent,
                };
            })
        );

        // Aggregate popular main dishes across all events
        const allOrders = await Order.find().populate('items.menuItem');
        console.log('Total orders found:', allOrders.length);

        if (allOrders.length > 0) {
            console.log('Sample order:', JSON.stringify(allOrders[0], null, 2));
        }

        const dishMap = new Map<string, { count: number; sales: number; category: string }>();

        allOrders.forEach(order => {
            order.items.forEach(item => {
                const menuItem = item.menuItem as any;

                // Skip if menuItem is not populated or is null
                if (!menuItem || !menuItem.name || !menuItem.category) {
                    console.warn('Skipping item with invalid menuItem. Item:', JSON.stringify(item, null, 2));
                    return;
                }

                const dishName = menuItem.name;
                const category = menuItem.category;
                const itemSales = item.quantity * (menuItem.price || 0);

                // Only include Main category
                if (category === 'Main') {
                    const existing = dishMap.get(dishName);
                    if (existing) {
                        existing.count += item.quantity;
                        existing.sales += itemSales;
                    } else {
                        dishMap.set(dishName, {
                            count: item.quantity,
                            sales: itemSales,
                            category,
                        });
                    }
                }
            });
        });

        const popularDishes = Array.from(dishMap.entries())
            .map(([name, data]) => ({
                dishName: name,
                orderCount: data.count,
                totalSales: data.sales,
            }))
            .sort((a, b) => b.orderCount - a.orderCount);

        console.log('Popular dishes found:', popularDishes.length);

        // Aggregate popular dishes per event
        const popularDishesByEvent = await Promise.all(
            events.map(async (event) => {
                const eventOrders = await Order.find({ eventId: event._id }).populate('items.menuItem');
                const eventDishMap = new Map<string, { count: number; sales: number }>();

                eventOrders.forEach(order => {
                    order.items.forEach(item => {
                        const menuItem = item.menuItem as any;

                        // Skip if menuItem is not populated or is null
                        if (!menuItem || !menuItem.name || !menuItem.category) {
                            return;
                        }

                        const dishName = menuItem.name;
                        const category = menuItem.category;
                        const itemSales = item.quantity * (menuItem.price || 0);

                        // Only include Main category
                        if (category === 'Main') {
                            const existing = eventDishMap.get(dishName);
                            if (existing) {
                                existing.count += item.quantity;
                                existing.sales += itemSales;
                            } else {
                                eventDishMap.set(dishName, {
                                    count: item.quantity,
                                    sales: itemSales,
                                });
                            }
                        }
                    });
                });

                const dishes = Array.from(eventDishMap.entries())
                    .map(([name, data]) => ({
                        dishName: name,
                        orderCount: data.count,
                        totalSales: data.sales,
                    }))
                    .sort((a, b) => b.orderCount - a.orderCount);

                return {
                    eventId: event._id,
                    eventName: event.name,
                    dishes,
                };
            })
        );

        // Return aggregated data
        res.json({
            eventSales: eventSalesData,
            popularDishes,
            popularDishesByEvent,
            eventPerformance: eventSalesData.map(event => ({
                eventName: event.eventName,
                eventDate: event.eventDate,
                totalOrders: event.totalOrders,
                totalSales: event.totalSales,
                categoryBreakdown: event.categoryBreakdown,
                status: new Date(event.eventDate) > new Date() ? 'Upcoming' : 'Past',
            })),
        });
    } catch (error) {
        console.error('Error fetching dashboard reports:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
