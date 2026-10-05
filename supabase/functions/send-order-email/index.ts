import "@supabase/functions-js/edge-runtime.d.ts";
import { handleCorsPreflight, corsHeaders } from "../_shared/cors.ts";

const ADMIN_EMAIL = "jeyareshd@gmail.com";

export default {
  async fetch(req: Request): Promise<Response> {
    const corsResponse = handleCorsPreflight(req);
    if (corsResponse) return corsResponse;

    try {
      const body = await req.json();
      const {
        adminEmail = ADMIN_EMAIL,
        orderId = "N/A",
        customerName = "Customer",
        customerEmail = "N/A",
        customerPhone = "N/A",
        paymentMethod = "COD",
        address = "N/A",
        skuId = "N/A",
        category = "N/A",
        itemsListFormatted = "N/A",
        totalPrice = 0,
        subtotal = 0,
        discount = 0,
        shippingFee = 0,
      } = body;

      const payload = {
        _subject: `[Anika Fashion] Order Notification #${orderId}`,
        _template: "table",
        _captcha: "false",
        "Order Number": `#${orderId}`,
        "Payment Method": String(paymentMethod),
        "Customer Name": String(customerName),
        "Customer Email": String(customerEmail),
        "Customer Phone": String(customerPhone),
        "Shipping Address": String(address),
        "SKU": String(skuId),
        "Category": String(category),
        "Order Breakdown": String(itemsListFormatted),
        "Subtotal": `₹${Number(subtotal).toLocaleString('en-IN')}`,
        "Discount": discount > 0 ? `-₹${Number(discount).toLocaleString('en-IN')}` : '₹0',
        "Shipping": shippingFee > 0 ? `₹${Number(shippingFee).toLocaleString('en-IN')}` : 'Free',
        "Total Amount": `₹${Number(totalPrice).toLocaleString('en-IN')}`,
      };

      const res = await fetch(`https://formsubmit.co/ajax/${adminEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => ({}));

      return new Response(
        JSON.stringify({ success: res.ok, recipient: adminEmail, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
