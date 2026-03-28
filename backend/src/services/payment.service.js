const crypto = require("crypto");
const Razorpay = require("razorpay");

const PROVIDERS = {
  MOCK: "mock",
  RAZORPAY: "razorpay",
};

const getPaymentProvider = () => {
  const configured = String(process.env.PAYMENT_PROVIDER || PROVIDERS.MOCK).toLowerCase();
  return Object.values(PROVIDERS).includes(configured) ? configured : PROVIDERS.MOCK;
};

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("RAZORPAY_CONFIG_MISSING");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const getRazorpayWebhookSecret = () => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET_MISSING");
  }

  return process.env.RAZORPAY_WEBHOOK_SECRET;
};

const createMockOrder = async ({ amount, campaign_id, user_id }) => ({
  provider: PROVIDERS.MOCK,
  order_id: "order_" + crypto.randomBytes(8).toString("hex"),
  amount: Number(amount),
  currency: "INR",
  status: "created",
  metadata: {
    campaign_id,
    user_id,
  },
});

const verifyMockPayment = async () => ({
  success: true,
  payment_id: "pay_" + crypto.randomBytes(8).toString("hex"),
  signature: "simulated_signature",
});

const createRazorpayOrder = async ({ amount, campaign_id, user_id }) => {
  const razorpay = getRazorpayClient();
  const amountInPaise = Math.round(Number(amount) * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: `don_${campaign_id}_${user_id}_${Date.now()}`.slice(0, 40),
    notes: {
      campaign_id: String(campaign_id),
      user_id: String(user_id),
    },
  });

  return {
    provider: PROVIDERS.RAZORPAY,
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    key_id: process.env.RAZORPAY_KEY_ID,
  };
};

const verifyRazorpayPayment = async ({
  order_id,
  payment_id,
  signature,
}) => {
  if (!order_id || !payment_id || !signature) {
    return { success: false };
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest("hex");

  if (generatedSignature !== signature) {
    return { success: false };
  }

  return {
    success: true,
    payment_id,
    signature,
  };
};

const verifyRazorpayWebhookSignature = ({
  rawBody,
  signature,
}) => {
  if (!rawBody || !signature) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac("sha256", getRazorpayWebhookSecret())
    .update(rawBody)
    .digest("hex");

  return generatedSignature === signature;
};

const createPaymentOrder = async (payload) => {
  const provider = getPaymentProvider();

  if (provider === PROVIDERS.RAZORPAY) {
    return createRazorpayOrder(payload);
  }

  return createMockOrder(payload);
};

const verifyPayment = async (payload) => {
  const provider = getPaymentProvider();

  if (provider === PROVIDERS.RAZORPAY) {
    return verifyRazorpayPayment(payload);
  }

  return verifyMockPayment(payload);
};

module.exports = {
  PROVIDERS,
  getPaymentProvider,
  createPaymentOrder,
  verifyPayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyRazorpayWebhookSignature,
};
