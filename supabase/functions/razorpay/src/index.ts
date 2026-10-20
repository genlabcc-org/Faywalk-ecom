import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { handleCorsPreflight, corsHeaders } from "../../_shared/cors.ts";
import { RazorpayService } from "./service.ts";

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req: any, ctx: any) => {
    // 1. Handle CORS preflight request
    const corsResponse = handleCorsPreflight(req);
    if (corsResponse) return corsResponse;

    try {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : "";

      let user = null;
      if (token) {
        try {
          const { data: authData } = await ctx.supabaseAdmin.auth.getUser(token);
          user = authData?.user || null;
        } catch {
          try {
            const { data: authData } = await ctx.supabase.auth.getUser(token);
            user = authData?.user || null;
          } catch {}
        }
      }

      // Parse request body
      const body = await req.json().catch(() => ({}));
      const { action } = body;

      // Customer actions require authenticated customer
      if (action === "create_order" || action === "verify_payment") {
        if (!user) {
          return new Response(
            JSON.stringify({ error: "Unauthorized user" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const razorpayService = new RazorpayService(ctx.supabaseAdmin);

      if (action === "create_order") {
        const { items, addressId, discountCode } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
          return new Response(
            JSON.stringify({ error: "Missing or empty items array" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const orderDetails = await razorpayService.createOrder({
          userId: user.id,
          items,
          addressId: addressId ? Number(addressId) : undefined,
          discountCode,
        });
        return new Response(
          JSON.stringify({
            success: true,
            orderId: orderDetails.orderId,
            amount: orderDetails.amount,
            currency: orderDetails.currency,
            productName: orderDetails.productName,
            keyId: orderDetails.keyId,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "verify_payment") {
        const {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          items,
          addressId,
          discountCode,
        } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !items || !Array.isArray(items) || items.length === 0) {
          return new Response(
            JSON.stringify({ error: "Missing required payment verification details" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const finalOrder = await razorpayService.verifyPayment({
          userId: user.id,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          items,
          addressId: addressId ? Number(addressId) : undefined,
          discountCode,
        });

        return new Response(
          JSON.stringify({ success: true, order: finalOrder }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "refund_order") {
        const { orderId, reason } = body;
        if (!orderId) {
          return new Response(
            JSON.stringify({ error: "Missing required orderId parameter" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const refundResult = await razorpayService.refundOrder(orderId, reason);
        return new Response(
          JSON.stringify(refundResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }),
};
