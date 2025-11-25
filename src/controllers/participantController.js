const Participant = require("../models/Participant");
const Event = require("../models/Event");
const Payment = require("../models/Payments");
const nodemailer = require("nodemailer");

const generateTicketNumber = () => {
    return 'TICKET_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
};

exports.registerParticipantWithPayment = async (req, res) => {
    try {
        const { eventId } = req.params;
        const {
            orderId,
            billingFirstName,
            billingLastName,
            billingEmail,
            billingPhone,
            attendeeName,
            identificationNumber,
            age,
            gender,
            attendeeEmail,
            tshirtSize,
            raceCategory,
            teamName,
            amount,
            numberOfTickets = 1,
            paymentDate
        } = req.body.data;

        console.log(req.body.data);
        console.log("Registering participant with payment for event:", eventId);

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        if (event.status !== "upcoming" && event.status !== "ongoing") {
            return res.status(400).json({ message: "Registrations are closed for this event" });
        }

        const availableSpots = event.ticketStatus.maximumOccupancy - event.ticketStatus.totalNumberOfPlayers;
        if (availableSpots < numberOfTickets) {
            return res.status(400).json({
                message: `Only ${availableSpots} spots available, but requested ${numberOfTickets} tickets`
            });
        }

        const ticketNumbers = [];
        for (let i = 0; i < numberOfTickets; i++) {
            ticketNumbers.push(generateTicketNumber());
        }

        const participant = new Participant({
            billingInfo: {
                firstName: billingFirstName,
                lastName: billingLastName,
                email: billingEmail,
                phone: billingPhone
            },
            attendeeInfo: {
                name: attendeeName,
                identificationNumber,
                age,
                gender,
                emailAddress: attendeeEmail,
                tshirtSize,
                raceCategory,
                teamName: teamName || ""
            },
            orderId: orderId,
            eventId: event._id,
            ticketNumbers: ticketNumbers,
            numberOfTickets,
            paymentStatus: 'successful',
            scannedTickets: 0,
            scannedStatus: new Array(numberOfTickets).fill(false)
        });

        await participant.save();

        event.ticketStatus.totalNumberOfPlayers += numberOfTickets;
        event.ticketStatus.unscannedTickets += numberOfTickets;
        await event.save();

        const payment = new Payment({
            amount,
            date: paymentDate || new Date(),
            participantId: participant._id,
            numberOfTickets,
            eventId: event._id,
        });

        await payment.save();

        await sendPaymentConfirmationEmail(
            orderId,
            billingEmail,
            billingFirstName,
            ticketNumbers,
            amount,
            event.eventName || 'Event',
            numberOfTickets,
            eventId
        );

        console.log("Participant registered and payment confirmed successfully:", participant._id);

        res.status(201).json({
            message: "Participant registered and payment confirmed successfully",
            data: {
                participant: {
                    id: participant._id,
                    ticketNumbers: participant.ticketNumbers,
                    billingInfo: participant.billingInfo,
                    attendeeInfo: participant.attendeeInfo,
                    eventId: participant.eventId,
                    paymentStatus: participant.paymentStatus,
                    numberOfTickets: participant.numberOfTickets,
                    scannedTickets: participant.scannedTickets,
                    createdAt: participant.createdAt
                },
                payment: {
                    id: payment._id,
                    amount: payment.amount,
                    date: payment.date,
                    numberOfTickets: payment.numberOfTickets
                }
            }
        });

    } catch (err) {
        console.error("Error registering participant with payment:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

const sendPaymentConfirmationEmail = async (orderId, email, name, ticketNumbers, amount, eventName, numberOfTickets, eventId) => {
    try {
        const event = await Event.findById(eventId);
        if (!event) {
            throw new Error("Event not found");
        }

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const ticketList = ticketNumbers.map((ticketNumber, index) =>
            `<li>Ticket ${index + 1}: <strong>${ticketNumber}</strong></li>`
        ).join('');

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'GO Sports - Registration and Payment Confirmation',
            html: `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6;">
      <h2 style="color: #2c5aa0; text-align: center;">GO Sports</h2>
      <h3 style="color: #2c5aa0;">Registration & Payment Confirmation</h3>
      
      <p>Dear ${name},</p>
      <p>Thank you for registering for <strong>${eventName}</strong>! Your payment has been successfully processed.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2c5aa0;">
        <h4 style="color: #2c5aa0; margin-top: 0;">Registration Details:</h4>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Number of Tickets:</strong> ${numberOfTickets}</p>
        <p><strong>Ticket Numbers:</strong></p>
        <ul>${ticketList}</ul>
        <p><strong>Event:</strong> ${eventName}</p>
        <p><strong>Venue:</strong> ${event.venue || 'Venue not specified'}</p>
        <p><strong>Date & Time:</strong> ${new Date(event.eventDate).toLocaleString()}</p>
        <p><strong>Event Image:</strong><br><img src="${event.image || 'default_image_url'}" alt="Event Image" style="max-width: 100%; height: auto;" /></p>
        <p><strong>Total Amount Paid:</strong> $${amount}</p>
        <p><strong>Transaction Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      
      <p>Please keep this confirmation for your records. Each ticket must be scanned individually at the event.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="font-size: 14px; color: #666;">
          If you have any questions, please contact our support team and reference your Order ID: <strong>${orderId}</strong>
        </p>
      </div>
      
      <p>Best regards,<br><strong>The GO Sports Team</strong></p>
    </div>
  `,
        };

        await transporter.sendMail(mailOptions);
        console.log("Payment confirmation email sent to:", email);

    } catch (error) {
        console.error("Error sending payment confirmation email:", error);
    }
};

exports.getEventParticipants = async (req, res) => {
    try {
        // Check if the user is an admin
        if (req.user.userType !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only admins can view participants." });
        }

        // Get eventId from the request parameters, if it exists
        const { eventId } = req.params;

        // If eventId is provided, filter by eventId, else retrieve all participants
        const filter = eventId ? { eventId: eventId } : {};

        const participants = await Participant.find(filter)
            .sort({ createdAt: -1 });

        // Return the participants
        res.json({
            message: "Participants retrieved successfully",
            participants: participants.map(participant => ({
                id: participant._id,
                ticketNumbers: participant.ticketNumbers,
                billingInfo: participant.billingInfo,
                attendeeInfo: participant.attendeeInfo,
                paymentStatus: participant.paymentStatus,
                numberOfTickets: participant.numberOfTickets,
                scannedTickets: participant.scannedTickets,
                scannedStatus: participant.scannedStatus,
                createdAt: participant.createdAt,
                eventId: participant.eventId
            }))
        });

    } catch (err) {
        console.error("Error fetching participants:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.scanTicket = async (req, res) => {
    try {
        const { ticketNumber } = req.params;

        const participant = await Participant.findOne({
            ticketNumbers: { $in: [ticketNumber] }
        });

        if (!participant) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        const ticketIndex = participant.ticketNumbers.indexOf(ticketNumber);

        if (participant.scannedStatus[ticketIndex]) {
            return res.status(400).json({ message: "Ticket already scanned" });
        }

        participant.scannedStatus[ticketIndex] = true;
        participant.scannedTickets += 1;
        await participant.save();

        const event = await Event.findById(participant.eventId);
        if (event) {
            event.ticketStatus.unscannedTickets = Math.max(0, event.ticketStatus.unscannedTickets - 1);
            await event.save();
        }

        res.json({
            message: "Ticket scanned successfully",
            participant: {
                id: participant._id,
                attendeeName: participant.attendeeInfo.name,
                eventId: participant.eventId,
                ticketNumber: ticketNumber,
                scannedTickets: participant.scannedTickets,
                totalTickets: participant.numberOfTickets,
                allTicketsScanned: participant.scannedTickets === participant.numberOfTickets
            }
        });

    } catch (err) {
        console.error("Error scanning ticket:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.getParticipantByTicket = async (req, res) => {
    try {
        const { ticketNumber } = req.params;

        const participant = await Participant.findOne({
            ticketNumbers: { $in: [ticketNumber] }
        });

        if (!participant) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        const ticketIndex = participant.ticketNumbers.indexOf(ticketNumber);
        const isScanned = participant.scannedStatus[ticketIndex];

        res.json({
            message: "Participant retrieved successfully",
            participant: {
                id: participant._id,
                ticketNumbers: participant.ticketNumbers,
                billingInfo: participant.billingInfo,
                attendeeInfo: participant.attendeeInfo,
                eventId: participant.eventId,
                paymentStatus: participant.paymentStatus,
                numberOfTickets: participant.numberOfTickets,
                scannedTickets: participant.scannedTickets,
                scannedStatus: participant.scannedStatus,
                currentTicketScanned: isScanned,
                createdAt: participant.createdAt
            }
        });

    } catch (err) {
        console.error("Error fetching participant by ticket:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

