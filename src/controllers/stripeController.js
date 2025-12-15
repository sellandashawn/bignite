const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Event = require("../models/Event");
const Payment = require("../models/Payments");

/**
 * Create Stripe Checkout Session
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { eventId, quantity, totalAmount, eventName, participantId } =
      req.body;

    if (!eventId || !quantity || !totalAmount || !eventName) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["eventId", "quantity", "totalAmount", "eventName"],
      });
    }

    // Validate event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
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
              name: eventName,
            },
            unit_amount: Math.round(totalAmount * 100), // Stripe accepts cents
          },
          quantity,
        },
      ],
      metadata: {
        eventId,
        participantId: participantId || "N/A",
        quantity,
        totalAmount,
      },
      success_url: `${process.env.FRONTEND_URL}/payment`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
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
