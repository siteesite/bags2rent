import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function envStr(name: string, fallback = ""): string {
  return (Deno.env.get(name) || fallback).replace(/^["']|["']$/g, "").trim();
}

// Aceita tanto o token específico do ambiente quanto o token legado (fallback)
function getValidWebhookTokens(env: "sandbox" | "production" | null): string[] {
  const tokens: string[] = [];
  if (env === "production") {
    const prod = envStr("ASAAS_WEBHOOK_TOKEN_PRODUCTION");
    if (prod) tokens.push(prod);
  } else if (env === "sandbox") {
    const sb = envStr("ASAAS_WEBHOOK_TOKEN_SANDBOX");
    if (sb) tokens.push(sb);
  }
  // Sempre também aceita o token legado compartilhado
  const legacy = envStr("ASAAS_WEBHOOK_TOKEN");
  if (legacy) tokens.push(legacy);
  return tokens;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // O Asaas envia o token do webhook no header 'asaas-access-token'
    const receivedToken = req.headers.get("asaas-access-token");
    // O cliente pode opcionalmente dizer qual ambiente está usando via header custom
    const envHint = req.headers.get("x-asaas-environment") as
      | "sandbox"
      | "production"
      | null;

    // Tenta validar com o token específico do ambiente (se houver hint), e
    // também aceita o token legado compartilhado (sem hint ou com qualquer ambiente).
    const tokensForHint = getValidWebhookTokens(envHint);
    const tokensAnyEnv = getValidWebhookTokens(null);

    if (receivedToken && tokensAnyEnv.length > 0) {
      const allowed = tokensForHint.length > 0 ? tokensForHint : tokensAnyEnv;
      if (!allowed.includes(receivedToken)) {
        console.error(`[webhook] Unauthorized: token mismatch (env hint=${envHint || "none"})`);
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
    } else if (receivedToken && tokensAnyEnv.length === 0) {
      // Sem tokens configurados: aceita (modo dev) mas avisa
      console.warn("[webhook] No ASAAS_WEBHOOK_TOKEN configured — accepting webhook without validation");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const data = await req.json();
    console.log("[webhook] Event:", data.event, "payment:", data.payment?.id, "env:", envHint || "(not specified)");

    const event = data.event;
    const payment = data.payment;
    const asaasPaymentId = payment.id;
    const orderName = payment.externalReference;

    if (!asaasPaymentId) {
      throw new Error("ID do pagamento não encontrado no webhook.");
    }

    const statusMap: Record<string, string> = {
      "PAYMENT_RECEIVED": "paid",
      "PAYMENT_CONFIRMED": "paid",
      "PAYMENT_RECEIVED_IN_CASH": "paid",
      "PAYMENT_OVERDUE": "overdue",
      "PAYMENT_DELETED": "cancelled",
      "PAYMENT_REFUNDED": "refunded",
      "PAYMENT_CHARGEBACK_REQUESTED": "chargeback",
    };

    const newStatus = statusMap[event];

    if (newStatus) {
      console.log(`[webhook] Updating order ${orderName || asaasPaymentId} → ${newStatus}`);

      const updateData: any = {
        payment_status: newStatus,
        financial_status: newStatus === "paid" ? "paid" : (newStatus === "overdue" ? "voided" : "pending"),
      };

      if (newStatus === "paid") {
        updateData.paid_at = new Date().toISOString();
      }

      // Atualiza por asaas_payment_id primeiro, depois por externalReference
      let { error: updateError } = await supabaseClient
        .from("orders")
        .update(updateData)
        .eq("asaas_payment_id", asaasPaymentId);

      if (updateError) {
        console.error("[webhook] Update by ID failed, trying by order_name:", updateError);
        if (orderName) {
          const { error: updateErrorName } = await supabaseClient
            .from("orders")
            .update(updateData)
            .eq("order_name", orderName);

          if (updateErrorName) throw updateErrorName;
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[webhook] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});