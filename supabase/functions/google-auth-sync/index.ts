import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCorsPreflight(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { email, name, phone } = body;

    const cleanPhone = (phone || "").trim();
    let cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail && !cleanPhone) {
      return new Response(JSON.stringify({ error: "Email or phone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no email but phone is provided, check if user exists in public.users with this phone
    if (!cleanEmail && cleanPhone) {
      const { data: userByPhone } = await supabaseAdmin
        .from("users")
        .select("email, id")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (userByPhone?.email && userByPhone.email.includes("@")) {
        cleanEmail = userByPhone.email;
      } else {
        cleanEmail = `${cleanPhone.replace(/[^0-9]/g, "")}@phone.faywalk.com`;
      }
    }

    const cleanName = (name || "").trim() || (cleanEmail ? cleanEmail.split("@")[0] : "User");

    // 1. Generate magiclink / signup OTP without sending any email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: cleanEmail,
      options: {
        data: {
          name: cleanName,
          phone: cleanPhone || undefined,
        },
      },
    });

    if (linkError) {
      console.error("Error generating auth link:", linkError);
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = linkData?.user?.id;

    // 2. Ensure row in public.users table exists with user info
    if (userId) {
      // Check if user already exists in public.users to preserve role
      const { data: existingUser } = await supabaseAdmin
        .from("users")
        .select("role, name, phone")
        .eq("id", userId)
        .maybeSingle();

      const userRole = existingUser?.role || "user";
      const userName = existingUser?.name || cleanName;
      const userPhone = cleanPhone || existingUser?.phone || "No phone set";

      await supabaseAdmin.from("users").upsert(
        {
          id: userId,
          email: cleanEmail,
          name: userName,
          phone: userPhone,
          role: userRole,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        hashed_token: linkData.properties.hashed_token,
        verification_type: linkData.properties.verification_type,
        userId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Server error in google-auth-sync:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
