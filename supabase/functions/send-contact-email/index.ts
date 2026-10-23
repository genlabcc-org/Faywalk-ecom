import { handleCorsPreflight, corsHeaders } from "../_shared/cors.ts";

const DEFAULT_RECIPIENT_EMAIL = "jreshma930@gmail.com";
const SENDER_EMAIL = "faywalkvibee@gmail.com";

function buildContactHtmlTemplate(data: {
  fullName: string;
  email: string;
  phone: string;
  message: string;
  dateStr: string;
}) {
  const { fullName, email, phone, message, dateStr } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact Inquiry - ${fullName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <div style="max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
    
    <!-- Header -->
    <div style="background-color: #002277; padding: 26px 28px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px;">FAYWALK</h1>
      <p style="margin: 6px 0 0; font-size: 13px; color: #93c5fd; letter-spacing: 0.5px; text-transform: uppercase;">
        Contact Us Form Submission
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 28px 24px;">

      <!-- Submitter Overview Badge -->
      <div style="background-color: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px 18px; margin-bottom: 22px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #1e40af; font-weight: 700; margin-bottom: 6px;">
          New Message Received
        </div>
        <div style="font-size: 16px; font-weight: 700; color: #002277;">
          ${fullName || "Website Visitor"}
        </div>
        <div style="font-size: 12.5px; color: #64748b; margin-top: 4px;">
          Received on: ${dateStr}
        </div>
      </div>

      <!-- Sender Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px;">
        <tr style="border-bottom: 1px solid #f1f3f5;">
          <td style="padding: 10px 0; color: #6b7280; width: 120px; font-weight: 500;">Full Name:</td>
          <td style="padding: 10px 0; color: #111827; font-weight: 600;">${fullName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f3f5;">
          <td style="padding: 10px 0; color: #6b7280; font-weight: 500;">Email Address:</td>
          <td style="padding: 10px 0; color: #002277; font-weight: 600;">
            <a href="mailto:${email}" style="color: #002277; text-decoration: none;">${email}</a>
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f3f5;">
          <td style="padding: 10px 0; color: #6b7280; font-weight: 500;">Phone Number:</td>
          <td style="padding: 10px 0; color: #111827; font-weight: 600;">
            ${phone ? `<a href="tel:${phone}" style="color: #111827; text-decoration: none;">${phone}</a>` : '<span style="color: #9ca3af;">Not provided</span>'}
          </td>
        </tr>
      </table>

      <!-- Message Container -->
      <div style="margin-bottom: 28px;">
        <div style="font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Message:
        </div>
        <div style="background-color: #f9fafb; border-left: 4px solid #002277; border-radius: 4px; padding: 16px 18px; font-size: 14px; line-height: 1.6; color: #1f2937; white-space: pre-wrap; font-family: inherit;">
${message}
        </div>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 26px 0 10px;">
        <a href="mailto:${email}?subject=Re:%20Your%20inquiry%20to%20Faywalk"
           style="display: inline-block; background-color: #002277; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">
          Reply to ${fullName}
        </a>
      </div>

      <!-- Footer Note -->
      <div style="padding-top: 20px; border-top: 1px solid #f1f3f5; text-align: center; color: #9ca3af; font-size: 11.5px;">
        This email was sent via the Contact Us form on Faywalk (<a href="https://faywalk.com" style="color: #002277; text-decoration: none;">faywalk.com</a>).
      </div>

    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const {
      recipientEmail = DEFAULT_RECIPIENT_EMAIL,
      firstName = "",
      lastName = "",
      phone = "",
      email = "",
      message = "",
    } = body;

    const fullName = `${firstName} ${lastName}`.trim() || "Website Visitor";
    const brevoApiKey = Deno.env.get("BREVO_API_KEY") || body.brevoApiKey || "";

    const dateStr = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const subject = `📩 [Faywalk Contact] New Inquiry from ${fullName}`;
    const htmlContent = buildContactHtmlTemplate({
      fullName,
      email,
      phone,
      message,
      dateStr,
    });

    const textContent = `New Contact Form Inquiry\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nDate: ${dateStr}\n\nMessage:\n${message}`;

    let brevoSuccess = false;
    let brevoResult: unknown = null;
    let brevoError: string | null = null;

    // 1. Attempt sending via Brevo Transactional Email API
    if (brevoApiKey) {
      try {
        const brevoPayload = {
          sender: {
            name: "Faywalk Contact",
            email: SENDER_EMAIL,
          },
          to: [
            {
              email: recipientEmail,
              name: "Reshma / Faywalk Team",
            },
          ],
          replyTo: {
            email: email || SENDER_EMAIL,
            name: fullName,
          },
          subject,
          htmlContent,
          textContent,
        };

        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(brevoPayload),
        });

        brevoResult = await brevoRes.json().catch(() => ({}));
        if (brevoRes.ok) {
          brevoSuccess = true;
          console.log(`[Brevo] Contact email successfully sent to ${recipientEmail}`);
        } else {
          brevoError = typeof brevoResult === "object" && brevoResult !== null
            ? JSON.stringify(brevoResult)
            : String(brevoResult);
          console.warn(`[Brevo] API returned error:`, brevoError);
        }
      } catch (err) {
        brevoError = err instanceof Error ? err.message : String(err);
        console.warn(`[Brevo] Network/Dispatch error:`, brevoError);
      }
    }

    if (brevoSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          provider: "brevo",
          recipient: recipientEmail,
          result: brevoResult,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fallback to FormSubmit if Brevo rejected or unavailable
    console.log(`[send-contact-email] Falling back to FormSubmit dispatcher for ${recipientEmail}...`);
    const fallbackPayload = {
      _subject: subject,
      _template: "table",
      _captcha: "false",
      "Full Name": fullName,
      "Email Address": email,
      "Phone Number": phone || "N/A",
      "Message": message,
      "Submitted At": dateStr,
      _brevo_error: brevoError || undefined,
    };

    const fsRes = await fetch(`https://formsubmit.co/ajax/${recipientEmail}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(fallbackPayload),
    });

    const fsResult = await fsRes.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        success: fsRes.ok,
        provider: "formsubmit_fallback",
        brevoError,
        recipient: recipientEmail,
        result: fsResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
