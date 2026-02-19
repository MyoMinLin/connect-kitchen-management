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

        // 1. Fetch all events (we need this to show events with 0 sales too)
        const allEvents = await Event.find().sort({ eventDate: -1 }).lean();

        // 2. Aggregate Global Popular Dishes (Main Dishes only)
        const popularDishes = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "items.menuItem",
                    foreignField: "_id",
                    as: "menuItem"
                }
            },
            { $unwind: "$menuItem" },
            { $match: { "menuItem.category": "Main" } },
            {
                $group: {
                    _id: "$menuItem.name",
                    orderCount: { $sum: "$items.quantity" },
                    totalSales: { $sum: { $multiply: ["$items.quantity", "$menuItem.price"] } }
                }
            },
            { $sort: { orderCount: -1 } },
            {
                $project: {
                    dishName: "$_id",
                    orderCount: 1,
                    totalSales: 1,
                    _id: 0
                }
            }
        ]);

        // 3. Aggregate Event Sales & Stats
        const eventStats = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "menuitems",
                    localField: "items.menuItem",
                    foreignField: "_id",
                    as: "menuItem"
                }
            },
            { $unwind: "$menuItem" },
            {
                $group: {
                    _id: "$eventId",
                    totalSales: { $sum: { $multiply: ["$items.quantity", "$menuItem.price"] } },
                    // We need to count unique orders, but we unwound items.
                    // Solution: Collect unique Order IDs in a Set-like array
                    uniqueOrderIds: { $addToSet: "$_id" },
                    // Collect categories for breakdown (we'll process this in the next stage or JS)
                    categories: { $push: { category: "$menuItem.category", quantity: "$items.quantity" } },
                    // Collect dishes for "Popular Dishes by Event"
                    dishes: {
                        $push: {
                            name: "$menuItem.name",
                            quantity: "$items.quantity",
                            price: "$menuItem.price",
                            category: "$menuItem.category"
                        }
                    }
                }
            },
            {
                $project: {
                    eventId: "$_id",
                    totalSales: 1,
                    totalOrders: { $size: "$uniqueOrderIds" },
                    categories: 1,
                    dishes: 1
                }
            }
        ]);


        // 4. Merge Aggregation Results with All Events
        // Create a map for easy lookup
        // Filter out null eventIds (from dirty data) before mapping
        const validStats = eventStats.filter(stat => stat.eventId);
        const statsMap = new Map(validStats.map(stat => [stat.eventId.toString(), stat]));

        const eventSalesData = allEvents.map(event => {
            const stats = statsMap.get(event._id.toString());

            // Default values if no orders for this event
            let totalOrders = 0;
            let totalSales = 0;
            let categoryBreakdown: Record<string, number> = {};

            if (stats) {
                totalOrders = stats.totalOrders;
                totalSales = stats.totalSales;

                // Process category breakdown from the array
                stats.categories.forEach((cat: any) => {
                    const name = cat.category;
                    categoryBreakdown[name] = (categoryBreakdown[name] || 0) + cat.quantity;
                });
            }

            return {
                eventId: event._id,
                eventName: event.name,
                eventDate: event.eventDate,
                totalOrders,
                totalSales,
                categoryBreakdown,
                isCurrentEvent: event.IsCurrentEvent,
            };
        });

        // 5. Process Popular Dishes By Event
        const popularDishesByEvent = allEvents.map(event => {
            const stats = statsMap.get(event._id.toString());
            let dishes: any[] = [];

            if (stats && stats.dishes) {
                const dishMap = new Map<string, { count: number; sales: number }>();

                stats.dishes.forEach((d: any) => {
                    if (d.category === 'Main') {
                        const existing = dishMap.get(d.name);
                        const sales = d.quantity * d.price;
                        if (existing) {
                            existing.count += d.quantity;
                            existing.sales += sales;
                        } else {
                            dishMap.set(d.name, { count: d.quantity, sales });
                        }
                    }
                });

                dishes = Array.from(dishMap.entries())
                    .map(([name, data]) => ({
                        dishName: name,
                        orderCount: data.count,
                        totalSales: data.sales
                    }))
                    .sort((a, b) => b.orderCount - a.orderCount);
            }

            return {
                eventId: event._id,
                eventName: event.name,
                dishes
            };
        });


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
                status: new Date(event.eventDate as Date) > new Date() ? 'Upcoming' : 'Past',
            })),
        });
    } catch (error) {
        console.error('Error fetching dashboard reports:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
