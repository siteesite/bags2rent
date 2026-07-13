import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ProxyRequest {
  action: "db" | "storage-signed-upload" | "storage-upload" | "storage-remove";
  table?: string;
  operation?: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  data?: any;
  match?: Array<{ column: string; op: "eq" | "in"; value: any }>;
  order?: { column: string; ascending: boolean };
  limit?: number;
  single?: boolean;
  bucket?: string;
  path?: string;
  paths?: string[];
  fileBase64?: string;
  contentType?: string;
}

const ALLOWED_TABLES = new Set([
  "products",
  "settings",
  "customers",
  "orders",
  "rentals",
  "coupons",
  "email_logs",
  "user_passkeys",
  "category_types",
  "categories",
  "public_settings",
]);

const ALLOWED_BUCKETS = new Set(["Produtos", "banners", "category-images"]);

function isAdmin(jwt: any): boolean {
  if (!jwt) return false;
  const role = jwt.app_metadata?.role ?? jwt.raw_app_meta_data?.role;
  return role === "admin";
}

function applyMatch(query: any, match?: ProxyRequest["match"]) {
  if (!match) return query;
  for (const item of match) {
    if (item.op === "eq") query = query.eq(item.column, item.value);
    else if (item.op === "in") query = query.in(item.column, item.value);
  }
  return query;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return json({ success: true }, 200);
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 200);
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return json({ success: false, error: "Missing authorization header" }, 200);
    }

    const userClient: SupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ success: false, error: "Invalid or expired session" }, 200);
    }

    if (!isAdmin(userData.user)) {
      return json({ success: false, error: "Forbidden: admin role required" }, 200);
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceKey) {
      return json({ success: false, error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, 200);
    }

    const admin: SupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceKey,
    );

    let body: ProxyRequest;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "Invalid JSON body" }, 200);
    }

    if (body.action === "db") {
      const { table, operation, columns, data, match, order, limit, single } = body;
      if (!table || !ALLOWED_TABLES.has(table)) {
        return json({ success: false, error: `Table '${table}' not allowed` }, 200);
      }
      if (!operation) {
        return json({ success: false, error: "Missing operation" }, 200);
      }

      try {
        switch (operation) {
          case "select": {
            let query: any = admin.from(table).select(columns ?? "*");
            query = applyMatch(query, match);
            if (order) query = query.order(order.column, { ascending: order.ascending });
            if (limit) query = query.limit(limit);
            if (single) query = query.single();
            const res = await query;
            return json({ success: !res.error, data: res.data, error: res.error?.message ?? null }, 200);
          }
          case "insert": {
            if (!data) return json({ success: false, error: "Missing data for insert" }, 200);
            const res = await admin.from(table).insert(data).select();
            return json({ success: !res.error, data: res.data, error: res.error?.message ?? null }, 200);
          }
          case "update": {
            if (!match?.length) return json({ success: false, error: "update requires match" }, 200);
            let query: any = admin.from(table).update(data);
            query = applyMatch(query, match);
            const res = await query.select();
            return json({ success: !res.error, data: res.data, error: res.error?.message ?? null }, 200);
          }
          case "upsert": {
            if (!data) return json({ success: false, error: "Missing data for upsert" }, 200);
            const res = await admin.from(table).upsert(data).select();
            return json({ success: !res.error, data: res.data, error: res.error?.message ?? null }, 200);
          }
          case "delete": {
            if (!match?.length) return json({ success: false, error: "delete requires match" }, 200);
            let query: any = admin.from(table).delete();
            query = applyMatch(query, match);
            const res = await query.select();
            return json({ success: !res.error, data: res.data, error: res.error?.message ?? null }, 200);
          }
          default:
            return json({ success: false, error: `Unknown operation: ${operation}` }, 200);
        }
      } catch (dbError: any) {
        return json({ success: false, error: "DB error: " + (dbError?.message || String(dbError)) }, 200);
      }
    }

    if (body.action === "storage-signed-upload") {
      const { bucket, path } = body;
      if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
        return json({ success: false, error: `Bucket '${bucket}' not allowed` }, 200);
      }
      if (!path) return json({ success: false, error: "Missing path" }, 200);

      try {
        const storage: any = admin.storage.from(bucket);
        const createSignedUploadUrl = storage.createSignedUploadUrl ?? storage.createSignedUploadURL;
        if (typeof createSignedUploadUrl !== "function") {
          return json({ success: false, error: "createSignedUploadUrl nao disponivel" }, 200);
        }
        const { data, error } = await createSignedUploadUrl.call(storage, path);
        return json({ success: !error, data, error: error?.message ?? null }, 200);
      } catch (error: any) {
        return json({ success: false, error: "Storage error: " + (error?.message || String(error)) }, 200);
      }
    }

    if (body.action === "storage-upload") {
      const { bucket, path, fileBase64, contentType } = body;
      if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
        return json({ success: false, error: `Bucket '${bucket}' not allowed` }, 200);
      }
      if (!path) return json({ success: false, error: "Missing path" }, 200);
      if (!fileBase64) return json({ success: false, error: "Missing fileBase64" }, 200);

      try {
        const bytes = base64ToBytes(fileBase64);
        const { data, error } = await admin.storage.from(bucket).upload(path, bytes, {
          contentType: contentType || "application/octet-stream",
          upsert: true,
        });
        return json({ success: !error, data, error: error?.message ?? null }, 200);
      } catch (error: any) {
        return json({ success: false, error: "Storage error: " + (error?.message || String(error)) }, 200);
      }
    }

    if (body.action === "storage-remove") {
      const { bucket, paths } = body;
      if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
        return json({ success: false, error: `Bucket '${bucket}' not allowed` }, 200);
      }
      if (!paths?.length) return json({ success: false, error: "Missing paths" }, 200);

      try {
        const { data, error } = await admin.storage.from(bucket).remove(paths);
        return json({ success: !error, data, error: error?.message ?? null }, 200);
      } catch (error: any) {
        return json({ success: false, error: "Storage error: " + (error?.message || String(error)) }, 200);
      }
    }

    return json({ success: false, error: "Unknown action" }, 200);
  } catch (error: any) {
    return json({ success: false, error: "Server error: " + (error?.message || String(error)) }, 200);
  }
});

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
