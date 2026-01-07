const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Event = require("../models/Event");
const Sport = require("../models/Sports");
const Payment = require("../models/Payments");

/**
 * Create Stripe Checkout Session
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const {
      eventId,
      sportId,
      quantity,
      totalAmount,
      eventName,
      sportName,
      participantId,
    } = req.body;

    // Validate required fields (either eventId or sportId must be provided)
    if (!quantity || !totalAmount) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["quantity", "totalAmount"],
      });
    }

    let eventOrSport = null;
    let eventOrSportName = "";

    // Fetch event or sport based on the provided ID
    if (eventId && eventId !== "null" && eventId !== "N/A") {
      // Validate event
      eventOrSport = await Event.findById(eventId);
      if (!eventOrSport) {
        return res.status(404).json({ message: "Event not found" });
      }
      eventOrSportName = eventOrSport.eventName || eventName;
    } else if (sportId && sportId !== "null" && sportId !== "N/A") {
      // Validate sport
      eventOrSport = await Sport.findById(sportId);
      if (!eventOrSport) {
        return res.status(404).json({ message: "Sport not found" });
      }
      eventOrSportName = eventOrSport.sportName || sportName;
    } else {
      // If no ID is provided, use the name from request
      eventOrSportName = eventName || sportName || "Sport/Event Registration";
    }

    // Validate the name
    if (!eventOrSportName || eventOrSportName.trim() === "") {
      eventOrSportName = "Sport/Event Registration";
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: eventOrSportName,
              description: `Quantity: ${quantity}`,
            },
            unit_amount: Math.round(totalAmount * 100), // Stripe accepts cents
          },
          quantity: 1, // Since totalAmount already includes quantity
        },
      ],
      metadata: {
        eventId: eventId || "N/A",
        sportId: sportId || "N/A",
        participantId: participantId || "N/A",
        quantity,
        totalAmount,
      },
      success_url: `${process.env.FRONTEND_URL}/payment`,
      cancel_url: `${process.env.FRONTEND_URL}/sports/${sportId || eventId}`,
    });

    return res.json({
      message: "Checkout session created successfully",
      session: {
        id: session.id,
        url: session.url,
      },
    });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
