import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "your_paystack_secret_here";

const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

export const initializeTransaction = async (email: string, amount: number, reference: string) => {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const response = await paystack.post("/transaction/initialize", {
    email,
    amount: amount * 100, // Paystack uses kobo
    reference,
    callback_url: `${appUrl}/api/payments/callback`,
  });
  return response.data;
};

export const verifyTransaction = async (reference: string) => {
  const response = await paystack.get(`/transaction/verify/${reference}`);
  return response.data;
};
