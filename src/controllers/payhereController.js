const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID;
const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET;
const RETURN_URL =
  process.env.PAYHERE_RETURN_URL ||
  `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/`;
const CANCEL_URL =
  process.env.PAYHERE_CANCEL_URL ||
  `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment/cancel`;
const NOTIFY_URL =
  process.env.PAYHERE_NOTIFY_URL ||
  `${process.env.BACKEND_URL || "http://localhost:5000"}/api/payhere/notify`;

const generateHash = (orderId, amount, currency) => {
  const md5Secret = crypto
    .createHash("md5")
    .update(MERCHANT_SECRET)
    .digest("hex")
    .toUpperCase();
  const hashString = MERCHANT_ID + orderId + amount + currency + md5Secret;
  return crypto
    .createHash("md5")
    .update(hashString)
    .digest("hex")
    .toUpperCase();
};

exports.createPayHereCheckout = async (req, res) => {
  try {
    const {
      attendees,
      totalAmount,
      eventId,
      sportId,
      eventName,
      sportName,
      schoolId,
      billingInfo,
    } = req.body;

    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({
        error: "Please provide at least one attendee",
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        error: "Invalid total amount",
      });
    }

    if (
      !billingInfo ||
      !billingInfo.firstName ||
      !billingInfo.lastName ||
      !billingInfo.email
    ) {
      return res.status(400).json({
        error:
          "Please provide billing information (firstName, lastName, email)",
      });
    }

    const orderId = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;
    const currency = "LKR";
    const amount = totalAmount.toFixed(2);

    const hash = generateHash(orderId, amount, currency);

    const orderData = {
      orderId,
      attendees,
      eventId,
      sportId,
      schoolId,
      totalAmount: parseFloat(amount),
      billingInfo,
      createdAt: new Date().toISOString(),
    };

    const ticketCount = attendees.length;
    const entityName = eventName || sportName || "Ticket";
    const itemsDescription = `${ticketCount} Ticket${
      ticketCount > 1 ? "s" : ""
    } - ${entityName}`;

    return res.json({
      action:
        process.env.PAYHERE_ENV === "production"
          ? "https://www.payhere.lk/pay/checkout"
          : "https://sandbox.payhere.lk/pay/checkout",
      fields: {
        merchant_id: MERCHANT_ID,
        return_url: RETURN_URL,
        cancel_url: CANCEL_URL,
        notify_url: NOTIFY_URL,
        order_id: orderId,
        items: itemsDescription,
        currency: currency,
        amount: amount,
        first_name: billingInfo.firstName,
        last_name: billingInfo.lastName,
        email: billingInfo.email,
        phone: billingInfo.phone || "",
        address: billingInfo.address || "",
        city: billingInfo.city || "",
        country: "Sri Lanka",
        hash: hash,
      },
      orderData: orderData,
    });
  } catch (error) {
    console.error("PayHere checkout error:", error);
    res.status(500).json({
      error: "Server error while creating PayHere checkout",
      message: error.message,
    });
  }
};

exports.handlePayHereNotification = async (req, res) => {
  try {
    const paymentData = req.method === "POST" ? req.body : req.query;

    const receivedHash = paymentData.hash;
    const md5Secret = crypto
      .createHash("md5")
      .update(MERCHANT_SECRET)
      .digest("hex")
      .toUpperCase();
    const hashString =
      MERCHANT_ID +
      paymentData.order_id +
      paymentData.payhere_amount +
      paymentData.currency +
      md5Secret;
    const calculatedHash = crypto
      .createHash("md5")
      .update(hashString)
      .digest("hex")
      .toUpperCase();

    if (receivedHash !== calculatedHash) {
      console.error("PayHere hash verification failed");
      return res.status(400).send("Hash verification failed");
    }

    if (paymentData.status_code === "2") {
      console.log("PayHere payment successful:", paymentData.order_id);

      return res.status(200).send("Payment notification received");
    } else {
      console.log("PayHere payment failed/cancelled:", paymentData.order_id);
      return res.status(200).send("Payment notification received");
    }
  } catch (error) {
    console.error("PayHere notification error:", error);
    res.status(500).send("Error processing notification");
  }
};
