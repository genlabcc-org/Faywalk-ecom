/// <reference path="../global.d.ts" />
// supabase/functions/icarry-webhook/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * iCarry Status Mapping (API documentation p. 34)
 */
const STATUS: Record<number, string> = {
  1: "Pending Pickup",
  2: "Processing",
  3: "Shipped",
  7: "Canceled",
  12: "Damaged",
  14: "Lost",
  16: "Voided",
  21: "Delivered",
  22: "In Transit",
  23: "Returned to Origin",
  24: "Manifested",
  25: "Pickup Scheduled",
  26: "Out For Delivery",
  27: "Pending Return",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Parse body as JSON or urlencoded or GET query params
    const url = new URL(req.url);
    let body: any = {};
    let formatUsed = "query";

    if (req.method === "GET") {
      for (const [k, v] of url.searchParams.entries()) {
        body[k] = v;
      }
    } else {
      const rawText = await req.text();
      try {
        body = JSON.parse(rawText);
        formatUsed = "json";
        console.log("[iCarry Webhook] Parsed JSON payload");
      } catch {
        try {
          const params = new URLSearchParams(rawText);
          const formObj: Record<string, any> = {};
          for (const [key, value] of params.entries()) {
            formObj[key] = value;
          }
          body = formObj;
          formatUsed = "urlencoded";
          console.log("[iCarry Webhook] Parsed application/x-www-form-urlencoded payload as fallback");
        } catch (parseErr) {
          console.warn("[iCarry Webhook] Failed to parse request body as JSON or urlencoded:", parseErr);
          body = {};
        }
      }
    }

    // Merge URL query params as fallback if fields missing from body
    for (const [k, v] of url.searchParams.entries()) {
      if (!body[k]) body[k] = v;
    }

    const callbackType = String(body.callback_type || body.event || body.type || body.action || "").trim();
    console.log(`[iCarry Webhook] Event: "${callbackType || 'unknown'}" (format: ${formatUsed})`);
    console.log(`[iCarry Webhook] Payload:`, JSON.stringify(body));

    const expectedToken = Deno.env.get("ICARRY_WEBHOOK_TOKEN");
    const icarryKey = Deno.env.get("ICARRY_KEY");

    // Optional token validation (warn instead of dropping if token missing from iCarry dashboard)
    if (expectedToken && body.token && body.token !== expectedToken && body.token !== icarryKey) {
      console.warn("[iCarry Webhook] 401 Unauthorized: token mismatch");
      return new Response(JSON.stringify({ error: "Unauthorized token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. CALLBACK: Status update, cancellation, or shipment event
    // ─────────────────────────────────────────────────────────────
    if (callbackType !== "ndr_status" && callbackType !== "new_weight_discrepancy") {
      const awb = String(body.awb || body.waybill || body.tracking_number || "").trim();
      const shipmentId = String(body.shipment_id || body.id || "").trim();
      const clientOrderId = String(body.client_order_id || body.order_id || "").trim();
      const statusCode = Number(body.status);
      const rawStatusStr = String(body.status || body.event || body.current_status || body.shipment_status || body.delivery_status || "").trim();
      const statusLower = rawStatusStr.toLowerCase();

      if (!awb && !shipmentId && !clientOrderId) {
        console.warn("[iCarry Webhook] Received webhook without AWB, shipment_id, or order_id:", body);
        return new Response(JSON.stringify({ ok: true, note: "missing identifiers" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find the order by waybill, shipment_id, or order_id
      let order: any = null;
      if (awb) {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("id, delivery_status, status, shipped_at, delivered_at")
          .eq("waybill", awb)
          .maybeSingle();
        if (error) console.error("[iCarry Webhook] Error querying by waybill:", error);
        order = data;
      }
      if (!order && shipmentId) {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("id, delivery_status, status, shipped_at, delivered_at")
          .eq("shipment_id", shipmentId)
          .maybeSingle();
        if (error) console.error("[iCarry Webhook] Error querying by shipment_id:", error);
        order = data;
      }
      if (!order && clientOrderId) {
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("id, delivery_status, status, shipped_at, delivered_at")
          .eq("id", clientOrderId)
          .maybeSingle();
        if (error) console.error("[iCarry Webhook] Error querying by clientOrderId:", error);
        order = data;
      }

      if (!order) {
        console.log(`[iCarry Webhook] Unknown shipment (AWB: ${awb}, Shipment ID: ${shipmentId}, Order: ${clientOrderId}). Returning 200.`);
        return new Response(JSON.stringify({ ok: true, note: "unknown order" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Determine new clean delivery status for the database
      let newDeliveryStatus = STATUS[statusCode] ?? (rawStatusStr || "Booked");
      const sLower = newDeliveryStatus.toLowerCase();

      // Initial booking / label generation / pending pickup -> Booked
      if (
        sLower.includes("shipping label") ||
        sLower.includes("label generated") ||
        sLower.includes("pending pickup") ||
        sLower.includes("processing") ||
        sLower.includes("manifested") ||
        sLower === "1" ||
        sLower === "2" ||
        sLower === "24" ||
        sLower === "25"
      ) {
        newDeliveryStatus = "Booked";
      }

      // Shipped / In Transit
      if (sLower === "3" || sLower === "22" || sLower.includes("shipped") || sLower.includes("transit")) {
        newDeliveryStatus = sLower.includes("transit") ? "In Transit" : "Shipped";
      }

      // Out for Delivery
      if (sLower === "26" || sLower.includes("out for delivery")) {
        newDeliveryStatus = "Out for Delivery";
      }

      // Delivered
      if (sLower === "21" || sLower.includes("delivered")) {
        newDeliveryStatus = "Delivered";
      }

      // Returned / RTO
      if (sLower === "23" || sLower === "27" || sLower.includes("return") || sLower.includes("rto")) {
        newDeliveryStatus = "Returned (RTO)";
      }

      const updates: Record<string, any> = {
        delivery_status: newDeliveryStatus,
      };

      if ((newDeliveryStatus === "Shipped" || newDeliveryStatus === "In Transit") && !order.shipped_at) {
        updates.shipped_at = new Date().toISOString();
        updates.status = "Shipped";
      }

      if (newDeliveryStatus === "Delivered" && !order.delivered_at) {
        updates.delivered_at = new Date().toISOString();
        updates.status = "Delivered";
      }

      // Canceled (7) or Voided (16) or status text contains cancel/void
      const isCancelled =
        statusCode === 7 ||
        statusCode === 16 ||
        statusLower.includes("cancel") ||
        statusLower.includes("void") ||
        callbackType.toLowerCase().includes("cancel") ||
        callbackType.toLowerCase().includes("void");

      if (isCancelled) {
        updates.status = "Cancelled";
        updates.delivery_status = "Cancelled";
      }

      const { error: updateErr } = await supabaseAdmin
        .from("orders")
        .update(updates)
        .eq("id", order.id);

      if (updateErr) {
        console.error(`[iCarry Webhook] Failed to update order ${order.id}:`, updateErr);
      } else {
        console.log(`[iCarry Webhook] Order ${order.id} updated: status="${updates.status || order.status}", delivery_status="${updates.delivery_status}"`);
      }

      return new Response(JSON.stringify({ ok: true, orderId: order.id, updates }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CALLBACK: ndr_status
    // ─────────────────────────────────────────────────────────────
    if (callbackType === "ndr_status") {
      let ndrList = body.ndr_data;
      if (typeof ndrList === "string") {
        try {
          ndrList = JSON.parse(ndrList);
        } catch {
          ndrList = [];
        }
      }
      if (!Array.isArray(ndrList)) {
        ndrList = [];
      }

      for (const item of ndrList) {
        const awb = item.awb ? String(item.awb).trim() : null;
        const shipmentId = item.shipment_id ? String(item.shipment_id).trim() : null;
        const ndrType = String(item.type || item.ndr_status || "issue").trim();
        const description = String(item.reason || item.description || item.comment || `NDR: ${ndrType}`).trim();

        let order = null;

        if (awb) {
          const { data } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("waybill", awb)
            .maybeSingle();
          order = data;
        }

        if (!order && shipmentId) {
          const { data } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("shipment_id", shipmentId)
            .maybeSingle();
          order = data;
        }

        if (order) {
          const newStatus = `ndr:${ndrType}`;
          await supabaseAdmin
            .from("orders")
            .update({
              delivery_status: newStatus,
              shipment_error: description,
            })
            .eq("id", order.id);
          console.log(`[iCarry Webhook] NDR update on order ${order.id}: delivery_status="${newStatus}", shipment_error="${description}"`);
        } else {
          console.log(`[iCarry Webhook] NDR item (AWB: ${awb}, Shipment ID: ${shipmentId}) does not match any order. Skipped.`);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. CALLBACK: new_weight_discrepancy
    // ─────────────────────────────────────────────────────────────
    if (callbackType === "new_weight_discrepancy") {
      console.log("[iCarry Webhook] new_weight_discrepancy payload:", JSON.stringify(body));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Unrecognized callback_type
    // ─────────────────────────────────────────────────────────────
    console.log(`[iCarry Webhook] Unrecognized callback_type: "${callbackType}". Payload:`, JSON.stringify(body));
    return new Response(JSON.stringify({ ok: true, message: "Ignored" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    // Never allow an unexpected exception to trigger a 500 retry storm from iCarry
    console.error("[iCarry Webhook] Unexpected error handling webhook:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
