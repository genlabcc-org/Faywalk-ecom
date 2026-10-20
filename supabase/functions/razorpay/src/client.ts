import crypto from "node:crypto";

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

export class RazorpayClient {
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
    this.keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
  }

  hasKeysConfigured(): boolean {
    return !!(this.keyId && this.keySecret);
  }

  getKeyId(): string {
    return this.keyId;
  }

  async createOrder(amountInPaise: number, receiptId: string, notes?: Record<string, string>): Promise<RazorpayOrderResult> {
    if (!this.hasKeysConfigured()) {
      throw new Error("Razorpay credentials are not configured in system environment variables");
    }

    const basicAuth = btoa(`${this.keyId}:${this.keySecret}`);
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: receiptId,
        ...(notes ? { notes } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Razorpay order creation API failure: ${errorText}`);
    }

    return await response.json();
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.hasKeysConfigured()) {
      throw new Error("Razorpay credentials are not configured in system environment variables");
    }

    const hmac = crypto.createHmac("sha256", this.keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest("hex");

    return generatedSignature === signature;
  }

  async createRefund(paymentId: string, amountInPaise?: number, notes?: Record<string, string>): Promise<any> {
    if (!this.hasKeysConfigured()) {
      throw new Error("Razorpay credentials are not configured in system environment variables");
    }

    const basicAuth = btoa(`${this.keyId}:${this.keySecret}`);
    const payload: Record<string, any> = {
      reverse_all: 1,
      ...(amountInPaise ? { amount: amountInPaise } : {}),
      ...(notes ? { notes } : {}),
    };

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedMsg = errorText;
      try {
        const errJson = JSON.parse(errorText);
        parsedMsg = errJson.error?.description || errJson.error?.message || errorText;
      } catch {}
      throw new Error(`Razorpay refund failure: ${parsedMsg}`);
    }

    return await response.json();
  }
}
