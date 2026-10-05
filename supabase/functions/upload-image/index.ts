import { S3Client, PutObjectCommand, DeleteObjectCommand } from "npm:@aws-sdk/client-s3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
  },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === "DELETE") {
      const { filePath } = await req.json();
      if (!filePath) {
        return new Response(JSON.stringify({ error: "Missing filePath" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await r2.send(new DeleteObjectCommand({
        Bucket: Deno.env.get("R2_BUCKET_NAME"),
        Key: filePath,
      }));

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // existing upload (POST) logic below, unchanged
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const filePath = formData.get("filePath") as string;
    const cacheControl = (formData.get("cacheControl") as string) || "3600";

    if (!file || !filePath) {
      return new Response(JSON.stringify({ error: "Missing file or filePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    await r2.send(new PutObjectCommand({
      Bucket: Deno.env.get("R2_BUCKET_NAME"),
      Key: filePath,
      Body: buffer,
      ContentType: file.type,
      CacheControl: `public, max-age=${cacheControl}`,
    }));

    const publicUrl = `${Deno.env.get("R2_PUBLIC_URL")}/${filePath}`;
    return new Response(JSON.stringify({ publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});