const Payment = require("../models/Payments");
const Event = require("../models/Event");
const mongoose = require("mongoose");

exports.getAllPayments = async (req, res) => {
    try {
        const { page = 1, limit = 10, eventId } = req.query;

        let filter = {};
        if (eventId) filter.eventId = eventId;

        const payments = await Payment.find(filter)
            .populate('participantId', 'billingInfo attendeeInfo ticketNumber')
            .populate('eventId', 'eventName date')
            .sort({ date: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Payment.countDocuments(filter);

        res.json({
            message: "Payments retrieved successfully",
            payments: payments.map(payment => ({
                id: payment._id,
                amount: payment.amount,
                date: payment.date,
                numberOfTickets: payment.numberOfTickets,
                participant: payment.participantId ? {
                    id: payment.participantId._id,
                    ticketNumber: payment.participantId.ticketNumber,
                    billingInfo: payment.participantId.billingInfo,
                    attendeeInfo: payment.participantId.attendeeInfo
                } : null,
                event: payment.eventId ? {
                    id: payment.eventId._id,
                    eventName: payment.eventId.eventName,
                    date: payment.eventId.date
                } : null
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalPayments: total
            }
        });

    } catch (err) {
        console.error("Error fetching payments:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


exports.getPaymentsByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 10, } = req.query;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        let filter = { eventId };

        const payments = await Payment.find(filter)
            .populate('participantId', 'billingInfo attendeeInfo ticketNumber')
            .sort({ date: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Payment.countDocuments(filter);

        // Calculate total revenue
        const revenueResult = await Payment.aggregate([
            { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
            { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        res.json({
            message: "Event payments retrieved successfully",
            event: {
                id: event._id,
                eventName: event.eventName,
                date: event.date
            },
            payments: payments.map(payment => ({
                id: payment._id,
                amount: payment.amount,
                date: payment.date,
                numberOfTickets: payment.numberOfTickets,
                participant: payment.participantId ? {
                    id: payment.participantId._id,
                    ticketNumber: payment.participantId.ticketNumber,
                    name: payment.participantId.attendeeInfo.name,
                    email: payment.participantId.billingInfo.email
                } : null
            })),
            summary: {
                totalRevenue,
                totalPayments: total,
                successfulPayments: await Payment.countDocuments({ eventId, status: 'successful' }),
                failedPayments: await Payment.countDocuments({ eventId, status: 'failed' })
            },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalPayments: total
            }
        });

    } catch (err) {
        console.error("Error fetching event payments:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


