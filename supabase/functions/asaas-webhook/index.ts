import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ASAAS_WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const receivedToken = req.headers.get("asaas-access-token");

    // Basic security check (if token is configured)
    if (ASAAS_WEBHOOK_TOKEN && receivedToken !== ASAAS_WEBHOOK_TOKEN) {
      console.error("[webhook] Unauthorized: Token mismatch");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const data = await req.json();
    console.log("[webhook] Received event:", data.event, "for payment:", data.payment?.id);

    const event = data.event;
    const payment = data.payment;
    const asaasPaymentId = payment.id;
    const orderName = payment.externalReference;

    if (!asaasPaymentId) {
      throw new Error("ID do pagamento não encontrado no webhook.");
    }

    // Map Asaas status to our system status
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
      console.log(`[webhook] Updating order ${orderName || asaasPaymentId} to status: ${newStatus}`);
      
      const updateData: any = {
        payment_status: newStatus,
        financial_status: newStatus === "paid" ? "paid" : (newStatus === "overdue" ? "voided" : "pending"),
      };

      if (newStatus === "paid") {
        updateData.paid_at = new Date().toISOString();
      }

      // Try to update by asaas_payment_id first, then externalReference
      let { error: updateError } = await supabaseClient
        .from("orders")
        .update(updateData)
        .eq("asaas_payment_id", asaasPaymentId);

      if (updateError) {
        console.error("[webhook] Error updating by ID, trying by order_name:", updateError);
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
