/// <reference path="../global.d.ts" />
// supabase/functions/razorpay-webhook/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import * as crypto from "node:crypto";
import { handleCorsPreflight, corsHeaders } from "../_shared/cors.ts";
import { bookShipmentForOrder } from "../_shared/bookShipment.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "faywalk_rzp_webhook_secret_2026";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Triggers order notification email via the send-order-email edge function
 */
async function sendNotificationEmail(order: any, orderItems: any[], address: any, user: any) {
  try {
    const customerName = address?.name || user?.name || "Valued Customer";
    const customerEmail = user?.email || address?.email || "N/A";
    const customerPhone = address?.mobile || address?.phone || user?.phone || "N/A";

    const formattedAddress = address
      ? [
          address.flat,
          address.area,
          address.city,
          address.state ? `${address.state} - ${address.pincode || address.pin_code}` : address.pincode,
        ]
          .filter(Boolean)
          .join(", ")
      : "N/A";

    const itemsListFormatted = (orderItems || [])
      .map(
        (it: any, idx: number) =>
          `[${idx + 1}] ${it.product_name || "Product"} (Qty: ${it.quantity || 1}) - ₹${it.price || 0}`
      )
      .join("\n");

    const emailPayload = {
      orderId: order.id,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod: "Razorpay (Online Payment)",
      address: formattedAddress,
      items: orderItems || [],
      itemsListFormatted,
      totalPrice: order.total_price || 0,
      subtotal: order.total_price || 0,
      discount: 0,
      shippingFee: order.shipping_fee || 0,
    };

    const res = await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!res.ok) {
      console.warn(`[Razorpay Webhook] send-order-email returned ${res.status}:`, await res.text());
    } else {
      console.log(`[Razorpay Webhook] Order confirmation email sent for #${order.id}`);
    }
  } catch (err) {
    console.warn(`[Razorpay Webhook] Failed to dispatch order email for #${order?.id}:`, err);
  }
}

Deno.serve(async (req: Request) => {
  // 1. CORS Preflight
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: true, message: "Method ignored" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      console.warn("[Razorpay Webhook] Missing x-razorpay-signature header");
      return new Response(JSON.stringify({ error: "Missing signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify Razorpay HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.warn("[Razorpay Webhook] 401 Unauthorized: Signature mismatch");
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse JSON body
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error("[Razorpay Webhook] Failed to parse JSON:", parseErr);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = body.event;
    console.log(`[Razorpay Webhook] Received verified event: "${event}"`);

    // We handle order.paid and payment.captured
    if (event !== "order.paid" && event !== "payment.captured") {
      console.log(`[Razorpay Webhook] Event "${event}" acknowledged and ignored.`);
      return new Response(JSON.stringify({ ok: true, message: `Event ${event} ignored` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentEntity = body.payload?.payment?.entity;
    const orderEntity = body.payload?.order?.entity;

    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const razorpayPaymentId = paymentEntity?.id;
    const notes = paymentEntity?.notes || orderEntity?.notes || {};

    if (!razorpayOrderId) {
      console.warn("[Razorpay Webhook] No order_id found in event payload:", body);
      return new Response(JSON.stringify({ ok: true, note: "No order_id in payload" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Razorpay Webhook] Processing payment for Razorpay Order: ${razorpayOrderId}, Payment: ${razorpayPaymentId}`);

    // 4. Find order in database
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();

    if (orderErr) {
      console.error(`[Razorpay Webhook] Database error fetching order for ${razorpayOrderId}:`, orderErr);
      return new Response(JSON.stringify({ ok: false, error: orderErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order) {
      // If already Paid, don't re-process
      if ((order.status || "").toLowerCase() === "paid" || (order.payment || "").toLowerCase() === "paid") {
        console.log(`[Razorpay Webhook] Order #${order.id} is already marked as Paid. Skipping duplicate processing.`);
        return new Response(JSON.stringify({ ok: true, message: "Order already paid" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark order as Paid
      console.log(`[Razorpay Webhook] Updating order #${order.id} from "${order.status}" to "Paid"`);
      const { data: updatedOrder, error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          status: "Paid",
          payment: "Razorpay",
          razorpay_payment_id: razorpayPaymentId || order.razorpay_payment_id,
        })
        .eq("id", order.id)
        .select()
        .single();

      if (updateErr) {
        console.error(`[Razorpay Webhook] Failed to update order #${order.id}:`, updateErr);
      }

      // Fetch customer address and profile for booking and emails
      let addressData = null;
      if (order.address_id) {
        const { data: addr } = await supabaseAdmin
          .from("addresses")
          .select("*")
          .eq("address_id", order.address_id)
          .maybeSingle();
        addressData = addr;
      }

      let userData = null;
      if (order.user_id) {
        const { data: usr } = await supabaseAdmin
          .from("users")
          .select("name, email, phone")
          .eq("id", order.user_id)
          .maybeSingle();
        userData = usr;
      }

      // 5. Book shipment with iCarry
      try {
        console.log(`[Razorpay Webhook] Auto-booking shipment with iCarry for order #${order.id}...`);
        const bookingResult = await bookShipmentForOrder(supabaseAdmin, order.id);
        console.log(`[Razorpay Webhook] iCarry booking result for #${order.id}:`, bookingResult);
      } catch (shipErr) {
        console.error(`[Razorpay Webhook] iCarry booking error for #${order.id}:`, shipErr);
      }

      // 6. Send order notification email
      await sendNotificationEmail(updatedOrder || order, order.order_items || [], addressData, userData);

      return new Response(JSON.stringify({ ok: true, message: `Order #${order.id} marked as Paid` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Order does not exist yet in orders table.
    // Atomically claim checkout session to ensure ONLY ONE order is created
    // even if order.paid and payment.captured arrive concurrently!
    // ─────────────────────────────────────────────────────────────
    console.log(`[Razorpay Webhook] Atomically claiming checkout session for ${razorpayOrderId}...`);
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("checkout_sessions")
      .delete()
      .eq("id", razorpayOrderId)
      .select()
      .maybeSingle();

    if (sessionErr) {
      console.error(`[Razorpay Webhook] Error querying checkout session for ${razorpayOrderId}:`, sessionErr);
    }

    if (!session) {
      console.log(`[Razorpay Webhook] No checkout session found (or already processed) for ${razorpayOrderId}. Exiting.`);
      return new Response(JSON.stringify({ ok: true, message: "Order already processed or session expired" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = session.user_id || notes.user_id || null;
    const addressId = session.address_id || (notes.address_id ? Number(notes.address_id) : null);
    const amountInRupees = session.total_price || (paymentEntity?.amount ? Number(paymentEntity.amount) / 100 : 0);
    const shippingFee = session.shipping_fee || 0;
    const itemName = session.product_name || notes.product_name || "Online Order";
    const quantity = session.quantity || 1;

    const { data: newOrder, error: createErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        address_id: addressId,
        item_name: itemName,
        quantity: quantity,
        total_price: amountInRupees,
        shipping_fee: shippingFee,
        payment: "Razorpay",
        type: "Regular",
        status: "Paid",
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
      })
      .select()
      .single();

    if (createErr || !newOrder) {
      console.error("[Razorpay Webhook] Failed to create order after payment:", createErr);
      return new Response(JSON.stringify({ ok: false, error: createErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Razorpay Webhook] Order #${newOrder.id} successfully created upon payment.`);

    let orderItemsToInsert: any[] = [];
    if (session.items && Array.isArray(session.items) && session.items.length > 0) {
      orderItemsToInsert = session.items.map((item: any) => ({
        order_id: newOrder.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        image_url: item.image,
        sku: item.sku,
      }));

      const { error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .insert(orderItemsToInsert);

      if (itemsErr) {
        console.warn("[Razorpay Webhook] Error inserting order items:", itemsErr.message);
      }
    }

    // Fetch customer address and user profile for courier booking & emails
    let addressData = null;
    if (addressId) {
      const { data: addr } = await supabaseAdmin
        .from("addresses")
        .select("*")
        .eq("address_id", addressId)
        .maybeSingle();
      addressData = addr;
    }

    let userData = null;
    if (userId) {
      const { data: usr } = await supabaseAdmin
        .from("users")
        .select("name, email, phone")
        .eq("id", userId)
        .maybeSingle();
      userData = usr;
    }

    // Auto-book shipment with iCarry
    try {
      console.log(`[Razorpay Webhook] Auto-booking shipment with iCarry for order #${newOrder.id}...`);
      const bookingResult = await bookShipmentForOrder(supabaseAdmin, newOrder.id);
      console.log(`[Razorpay Webhook] iCarry booking result for #${newOrder.id}:`, bookingResult);
    } catch (shipErr) {
      console.error(`[Razorpay Webhook] iCarry booking error for #${newOrder.id}:`, shipErr);
    }

    // Send order confirmation email
    await sendNotificationEmail(newOrder, orderItemsToInsert, addressData, userData);

    return new Response(JSON.stringify({ ok: true, orderId: newOrder.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Razorpay Webhook] Unexpected error:", errMsg);
    return new Response(JSON.stringify({ ok: false, error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
