const Participant = require("../models/Participant");
const Event = require("../models/Event");
const Payment = require("../models/Payments");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const crypto = require("crypto");

const generateTicketNumber = () => {
  return (
    "TICKET_" +
    Date.now() +
    "_" +
    Math.random().toString(36).substr(2, 5).toUpperCase()
  );
};

const generateQRHash = (data) => {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
};

const generateQRCodeData = async (ticketData) => {
  try {
    // Create JSON data for QR code
    const qrData = {
      ticketNumber: ticketData.ticketNumber,
      attendeeName: ticketData.attendeeName,
      attendeeId: ticketData.attendeeId,
      eventId: ticketData.eventId,
      eventName: ticketData.eventName,
      eventDate: ticketData.eventDate,
      timestamp: Date.now(),
      hash: ticketData.hash,
    };

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));

    return {
      qrData: qrCodeDataURL,
      qrText: JSON.stringify(qrData),
    };
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
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
      attendees,
      teamName,
      amount,
      numberOfTickets = 1,
      paymentDate,
    } = req.body.data;

    console.log(req.body.data);
    console.log("Registering participant with payment for event:", eventId);

    // Validate attendees array
    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ message: "No attendees provided" });
    }

    if (attendees.length !== numberOfTickets) {
      return res.status(400).json({
        message: `Number of attendees (${attendees.length}) does not match number of tickets (${numberOfTickets})`,
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.status !== "upcoming" && event.status !== "ongoing") {
      return res
        .status(400)
        .json({ message: "Registrations are closed for this event" });
    }

    const availableSpots =
      event.ticketStatus.maximumOccupancy -
      event.ticketStatus.totalNumberOfPlayers;
    if (availableSpots < numberOfTickets) {
      return res.status(400).json({
        message: `Only ${availableSpots} spots available, but requested ${numberOfTickets} tickets`,
      });
    }

    // Generate ticket numbers and QR codes for all attendees
    const ticketNumbers = [];
    const qrCodes = [];

    for (let i = 0; i < numberOfTickets; i++) {
      const ticketNumber = generateTicketNumber();
      ticketNumbers.push(ticketNumber);

      const attendee = attendees[i];
      const hashData = {
        ticketNumber,
        attendeeName: attendee.name,
        attendeeId: attendee.idNumber,
        eventId: event._id.toString(),
        secret: process.env.QR_SECRET || "default-secret-key",
      };

      const qrHash = generateQRHash(hashData);

      const qrCodeData = await generateQRCodeData({
        ticketNumber,
        attendeeName: attendee.name,
        attendeeId: attendee.idNumber,
        eventId: event._id.toString(),
        eventName: event.eventName,
        eventDate: event.date || event.eventDate,
        hash: qrHash,
      });

      qrCodes.push({
        ticketNumber,
        qrData: qrCodeData.qrData,
        qrHash: qrHash,
        isUsed: false,
      });
    }

    const mappedAttendees = attendees.map((attendee, index) => ({
      name: attendee.name,
      identificationNumber: attendee.idNumber,
      age: attendee.age ? parseInt(attendee.age) : null,
      gender: attendee.gender,
      emailAddress: attendee.attendeeEmail,
      //   tshirtSize: attendee.tshirtSize,
      //   raceCategory: attendee.raceCategory,
      teamName: teamName || attendee.teamName || "",
    }));

    // Validate required fields for each attendee
    for (let i = 0; i < mappedAttendees.length; i++) {
      const attendee = mappedAttendees[i];
      if (
        !attendee.name ||
        !attendee.identificationNumber ||
        !attendee.gender
      ) {
        return res.status(400).json({
          message: `Attendee ${i + 1} is missing required fields`,
        });
      }
    }

    const participant = new Participant({
      billingInfo: {
        firstName: billingFirstName,
        lastName: billingLastName,
        email: billingEmail,
        phone: billingPhone,
      },
      attendeeInfo: mappedAttendees,
      orderId: orderId,
      eventId: event._id,
      ticketNumbers: ticketNumbers,
      qrCodes: qrCodes,
      numberOfTickets,
      paymentStatus: "successful",
      scannedTickets: 0,
      scannedStatus: new Array(numberOfTickets).fill(false),
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
      qrCodes,
      amount,
      event.eventName || "Event",
      numberOfTickets,
      eventId,
      mappedAttendees
    );

    console.log(
      "Participant registered and payment confirmed successfully:",
      participant._id
    );

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
          createdAt: participant.createdAt,
        },
        payment: {
          id: payment._id,
          amount: payment.amount,
          date: payment.date,
          numberOfTickets: payment.numberOfTickets,
        },
      },
    });
  } catch (err) {
    console.error("Error registering participant with payment:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const sendPaymentConfirmationEmail = async (
  orderId,
  email,
  name,
  ticketNumbers,
  qrCodes,
  amount,
  eventName,
  numberOfTickets,
  eventId,
  attendees
) => {
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

    const eventDate = event.date || event.eventDate;
    const formattedDate = eventDate
      ? new Date(eventDate).toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Date not specified";

    const eventTime = event.time ? ` at ${event.time}` : "";

    // Generate unique CID for each QR code
    const qrAttachments = qrCodes.map((qrCode, index) => {
      const cid = `qr_${ticketNumbers[index]}_${Date.now()}`;
      return {
        filename: `ticket_${ticketNumbers[index]}.png`,
        path: qrCode.qrData,
        cid: cid,
        contentType: "image/png",
      };
    });

    const attendeeList = attendees
      .map(
        (attendee, index) => `
      <div style="background-color: #f9f9f9; padding: 15px; margin-bottom: 15px; border-left: 3px solid #2c5aa0; border-radius: 5px;">
        <p><strong>Attendee ${index + 1}:</strong> ${attendee.name}</p>
        <p><strong>Ticket Number:</strong> ${ticketNumbers[index]}</p>
        <div style="margin: 15px 0;">
          <p><strong>QR Code:</strong></p>
          <img src="cid:qr_${
            ticketNumbers[index]
          }_${Date.now()}" alt="QR Code for ${
          attendee.name
        }" style="max-width: 200px; height: auto; border: 1px solid #ddd; padding: 10px; background: white; display: block; margin: 10px 0;" />
          <p style="font-size: 12px; color: #666; margin-top: 5px;">Scan this QR code at the event entrance</p>
        </div>
        <p><strong>Gender:</strong> ${attendee.gender}</p>
        ${
          attendee.teamName
            ? `<p><strong>Team Name:</strong> ${attendee.teamName}</p>`
            : ""
        }
      </div>
    `
      )
      .join("");

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "GO Sports - Registration and Payment Confirmation",
      html: `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #333333; line-height: 1.6;">
      <div style="text-align: center; padding: 20px 0; background-color: #2c5aa0; color: white;">
        <h2 style="margin: 0;">GO Sports</h2>
        <h3 style="margin: 10px 0 0 0;">Registration & Payment Confirmation</h3>
      </div>
      
      <div style="padding: 20px;">
        <p>Dear ${name},</p>
        <p>Thank you for registering for <strong>${eventName}</strong>! Your payment has been successfully processed and your tickets are attached below.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #ddd;">
          <h4 style="color: #2c5aa0; margin-top: 0;">Registration Summary:</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div>
              <p><strong>Order ID:</strong><br>${orderId}</p>
              <p><strong>Number of Tickets:</strong><br>${numberOfTickets}</p>
              <p><strong>Total Amount Paid:</strong><br>$${amount}</p>
            </div>
            <div>
              <p><strong>Event:</strong><br>${eventName}</p>
              <p><strong>Venue:</strong><br>${
                event.venue || "Venue not specified"
              }</p>
              <p><strong>Date & Time:</strong><br>${formattedDate}${eventTime}</p>
            </div>
          </div>
          
          <h4 style="color: #2c5aa0; margin-top: 20px; margin-bottom: 20px;">Your Tickets:</h4>
          ${attendeeList}
        </div>
        
        <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2c5aa0;">
          <h5 style="color: #2c5aa0; margin-top: 0;">Important Instructions:</h5>
          <ul style="margin-bottom: 0;">
            <li>Each attendee must present their unique QR code at the entrance</li>
            <li>QR codes can be displayed on your mobile device or printed</li>
            <li>QR codes are also attached to this email as PNG files</li>
            <li>Keep this email for reference</li>
            <li>Arrive at least 30 minutes before the event starts</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="font-size: 14px; color: #666;">
            If you have any questions, please contact our support team and reference your Order ID: <strong>${orderId}</strong>
          </p>
        </div>
        
        <p>Best regards,<br><strong>The GO Sports Team</strong></p>
      </div>
    </div>
  `,
      attachments: qrAttachments,
    };

    await transporter.sendMail(mailOptions);
    console.log(
      "Payment confirmation email with embedded QR codes sent to:",
      email
    );
  } catch (error) {
    console.error("Error sending payment confirmation email:", error);
  }
};

//ScanTicket function to validate QR code hash
exports.scanTicketByQR = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Only admins can create events." });
    }

    const { qrData, eventId } = req.body;
    console.log("DEBUG - Received QR data:", qrData);
    console.log("DEBUG - Event ID from request body:", eventId);

    // Parse QR code data
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
      console.log("DEBUG - Parsed QR data:", parsedData);
    } catch (error) {
      console.error("DEBUG - JSON parse error:", error);
      return res.status(400).json({ message: "Invalid QR code data" });
    }

    const { ticketNumber, hash, eventId: qrEventId } = parsedData;

    if (!ticketNumber) {
      return res
        .status(400)
        .json({ message: "Ticket number not found in QR code" });
    }

    console.log("DEBUG - Ticket number:", ticketNumber);
    console.log("DEBUG - Event ID from QR code:", qrEventId);

    // Check if eventId in QR code matches the eventId from request body
    if (qrEventId && eventId && qrEventId !== eventId) {
      console.log("DEBUG - Event ID mismatch!");
      console.log("DEBUG - QR Event ID:", qrEventId);
      console.log("DEBUG - Request Event ID:", eventId);

      // Try to find the event names for better error message
      let qrEventName = "Unknown Event";
      let selectedEventName = "Unknown Event";

      try {
        if (qrEventId) {
          const qrEvent = await Event.findById(qrEventId);
          if (qrEvent) qrEventName = qrEvent.eventName;
        }
        if (eventId) {
          const selectedEvent = await Event.findById(eventId);
          if (selectedEvent) selectedEventName = selectedEvent.eventName;
        }
      } catch (err) {
        console.log("DEBUG - Could not fetch event names:", err);
      }

      return res.status(400).json({
        message: "QR code does not belong to the selected event",
        details: {
          selectedEvent: {
            id: eventId,
            name: selectedEventName,
          },
          qrCodeEvent: {
            id: qrEventId,
            name: qrEventName,
          },
        },
        error: "EVENT_MISMATCH",
      });
    }

    // Find participant by ticket number
    const participant = await Participant.findOne({
      ticketNumbers: { $in: [ticketNumber] },
    }).populate("eventId");

    if (!participant) {
      console.log("DEBUG - Ticket not found in database");
      return res.status(404).json({ message: "Ticket not found" });
    }

    console.log("DEBUG - Found participant:", participant._id);
    console.log("DEBUG - Participant's event ID:", participant.eventId?._id);

    // Additional validation: Check if participant's event matches the provided eventId
    if (eventId && participant.eventId) {
      const participantEventId = participant.eventId._id
        ? participant.eventId._id.toString()
        : participant.eventId.toString();

      if (participantEventId !== eventId) {
        console.log("DEBUG - Participant event ID mismatch!");
        console.log("DEBUG - Participant Event ID:", participantEventId);
        console.log("DEBUG - Request Event ID:", eventId);

        let participantEventName = "Unknown Event";
        let selectedEventName = "Unknown Event";

        try {
          const partEvent = await Event.findById(participantEventId);
          if (partEvent) participantEventName = partEvent.eventName;

          const selEvent = await Event.findById(eventId);
          if (selEvent) selectedEventName = selEvent.eventName;
        } catch (err) {
          console.log("DEBUG - Could not fetch event names:", err);
        }

        return res.status(400).json({
          message: "Ticket does not belong to the selected event",
          details: {
            selectedEvent: {
              id: eventId,
              name: selectedEventName,
            },
            ticketEvent: {
              id: participantEventId,
              name: participantEventName,
            },
          },
          error: "TICKET_EVENT_MISMATCH",
        });
      }
    }

    // Validate event date is today
    const event = participant.eventId;
    if (!event) {
      return res.status(400).json({ message: "Event not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(event.date || event.eventDate);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() !== today.getTime()) {
      console.log("DEBUG - Event date does not match today");
      console.log("DEBUG - Event date:", eventDate);
      console.log("DEBUG - Today:", today);
      return res.status(400).json({
        message:
          "This event is not scheduled for today. Scanning is only allowed on the event date.",
        eventDate: event.date || event.eventDate,
        today: new Date(),
        eventName: event.eventName,
      });
    }

    console.log("DEBUG - Event date validated successfully");

    // Check if QR codes exist
    if (!participant.qrCodes || participant.qrCodes.length === 0) {
      console.log("DEBUG - No QR codes found in participant record");
      // Fall back to ticket number validation only
    } else {
      console.log(
        "DEBUG - Participant has QR codes:",
        participant.qrCodes.length
      );

      // Find the specific QR code
      const qrCodeIndex = participant.qrCodes.findIndex(
        (qr) => qr.ticketNumber === ticketNumber
      );

      if (qrCodeIndex !== -1) {
        const qrCode = participant.qrCodes[qrCodeIndex];
        console.log("DEBUG - Found QR code in database:", qrCode);

        // Validate hash if QR code has hash
        if (qrCode.qrHash && hash) {
          console.log("DEBUG - Validating hash...");
          console.log("DEBUG - QR code hash:", qrCode.qrHash);
          console.log("DEBUG - QR data hash:", hash);

          if (qrCode.qrHash !== hash) {
            console.log("DEBUG - Hash mismatch!");
            return res
              .status(400)
              .json({ message: "Invalid QR code - hash mismatch" });
          }

          // Check if already used
          if (qrCode.isUsed) {
            return res.status(400).json({
              message: "Ticket already scanned",
              scannedAt: qrCode.usedAt,
              scannedBy: qrCode.scannedBy,
              eventName: event.eventName,
            });
          }
        }
      }
    }

    // Find ticket index
    const ticketIndex = participant.ticketNumbers.indexOf(ticketNumber);

    if (ticketIndex === -1) {
      return res
        .status(404)
        .json({ message: "Ticket number not found in participant record" });
    }

    // Check if already scanned (using scannedStatus)
    if (participant.scannedStatus && participant.scannedStatus[ticketIndex]) {
      return res.status(400).json({
        message: "Ticket already scanned",
        scannedAt: participant.updatedAt,
        eventName: event.eventName,
      });
    }

    // Update QR code as used if exists
    if (participant.qrCodes && participant.qrCodes.length > 0) {
      const qrCodeIndex = participant.qrCodes.findIndex(
        (qr) => qr.ticketNumber === ticketNumber
      );

      if (qrCodeIndex !== -1) {
        participant.qrCodes[qrCodeIndex].isUsed = true;
        participant.qrCodes[qrCodeIndex].usedAt = new Date();
        participant.qrCodes[qrCodeIndex].scannedBy = req.user?.id || "admin";
      }
    }

    // Update scanned status
    if (!participant.scannedStatus) {
      participant.scannedStatus = new Array(participant.numberOfTickets).fill(
        false
      );
    }

    participant.scannedStatus[ticketIndex] = true;
    participant.scannedTickets = (participant.scannedTickets || 0) + 1;

    await participant.save();

    // Update event stats
    if (event) {
      event.ticketStatus.unscannedTickets = Math.max(
        0,
        (event.ticketStatus.unscannedTickets || 0) - 1
      );
      await event.save();
    }

    // Get attendee info
    const attendeeInfo = participant.attendeeInfo[ticketIndex];

    res.json({
      message: "Ticket scanned successfully",
      data: {
        ticketNumber,
        attendeeName: attendeeInfo ? attendeeInfo.name : "N/A",
        attendeeId: attendeeInfo ? attendeeInfo.identificationNumber : "N/A",
        eventName: event ? event.eventName : "Unknown Event",
        eventDate: event ? event.date || event.eventDate : null,
        scannedAt: new Date(),
        participantId: participant._id,
        allTicketsScanned:
          participant.scannedTickets === participant.numberOfTickets,
        remainingTickets:
          participant.numberOfTickets - participant.scannedTickets,
      },
    });
  } catch (err) {
    console.error("Error scanning QR code:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getEventParticipants = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Only admins can view participants." });
    }

    const { eventId } = req.query;
    let filter = {};

    if (eventId) {
      filter.eventId = eventId;
    }

    const participants = await Participant.find(filter).sort({ createdAt: -1 });

    res.json({
      message: eventId
        ? "Event participants retrieved successfully"
        : "All participants retrieved successfully",
      participants: participants.map((participant) => ({
        id: participant._id,
        ticketNumbers: participant.ticketNumbers,
        billingInfo: participant.billingInfo,
        attendeeInfo: participant.attendeeInfo,
        paymentStatus: participant.paymentStatus,
        numberOfTickets: participant.numberOfTickets,
        scannedTickets: participant.scannedTickets,
        scannedStatus: participant.scannedStatus,
        createdAt: participant.createdAt,
        eventId: participant.eventId,
        orderId: participant.orderId,
      })),
    });
  } catch (err) {
    console.error("Error fetching participants:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// exports.scanTicket = async (req, res) => {
//   try {
//     const { ticketNumber } = req.params;

//     const participant = await Participant.findOne({
//       ticketNumbers: { $in: [ticketNumber] },
//     });

//     if (!participant) {
//       return res.status(404).json({ message: "Ticket not found" });
//     }

//     const ticketIndex = participant.ticketNumbers.indexOf(ticketNumber);

//     if (participant.scannedStatus[ticketIndex]) {
//       return res.status(400).json({ message: "Ticket already scanned" });
//     }

//     // Get the attendee information for this specific ticket
//     const attendeeInfo = participant.attendeeInfo[ticketIndex];

//     participant.scannedStatus[ticketIndex] = true;
//     participant.scannedTickets += 1;
//     await participant.save();

//     const event = await Event.findById(participant.eventId);
//     if (event) {
//       event.ticketStatus.unscannedTickets = Math.max(
//         0,
//         event.ticketStatus.unscannedTickets - 1
//       );
//       await event.save();
//     }

//     res.json({
//       message: "Ticket scanned successfully",
//       participant: {
//         id: participant._id,
//         attendeeName: attendeeInfo ? attendeeInfo.name : "N/A",
//         eventId: participant.eventId,
//         ticketNumber: ticketNumber,
//         scannedTickets: participant.scannedTickets,
//         totalTickets: participant.numberOfTickets,
//         allTicketsScanned:
//           participant.scannedTickets === participant.numberOfTickets,
//         attendeeInfo: attendeeInfo,
//       },
//     });
//   } catch (err) {
//     console.error("Error scanning ticket:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

exports.getParticipantByTicket = async (req, res) => {
  try {
    const { ticketNumber } = req.params;

    const participant = await Participant.findOne({
      ticketNumbers: { $in: [ticketNumber] },
    });

    if (!participant) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const ticketIndex = participant.ticketNumbers.indexOf(ticketNumber);
    const isScanned = participant.scannedStatus[ticketIndex];
    const attendeeInfo = participant.attendeeInfo[ticketIndex];

    res.json({
      message: "Participant retrieved successfully",
      participant: {
        id: participant._id,
        ticketNumbers: participant.ticketNumbers,
        billingInfo: participant.billingInfo,
        attendeeInfo: participant.attendeeInfo,
        specificAttendee: attendeeInfo,
        eventId: participant.eventId,
        paymentStatus: participant.paymentStatus,
        numberOfTickets: participant.numberOfTickets,
        scannedTickets: participant.scannedTickets,
        scannedStatus: participant.scannedStatus,
        currentTicketScanned: isScanned,
        createdAt: participant.createdAt,
        orderId: participant.orderId,
      },
    });
  } catch (err) {
    console.error("Error fetching participant by ticket:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
