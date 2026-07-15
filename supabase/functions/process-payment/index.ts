import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AsaasEnv = "sandbox" | "production";

// Lê e normaliza uma variável de ambiente (remove aspas / espaços acidentais)
function envStr(name: string, fallback = ""): string {
  return (Deno.env.get(name) || fallback).replace(/^["']|["']$/g, "").trim();
}

// Resolve a chave, URL e webhook token de acordo com o ambiente
function getAsaasConfig(env: AsaasEnv) {
  if (env === "production") {
    return {
      apiKey: envStr("ASAAS_API_KEY_PRODUCTION") || envStr("ASAAS_API_KEY"),
      apiUrl: envStr("ASAAS_API_URL_PRODUCTION", "https://api.asaas.com/v3"),
      webhookToken: envStr("ASAAS_WEBHOOK_TOKEN_PRODUCTION") || envStr("ASAAS_WEBHOOK_TOKEN"),
    };
  }
  return {
    apiKey: envStr("ASAAS_API_KEY_SANDBOX") || envStr("ASAAS_API_KEY"),
    apiUrl: envStr("ASAAS_API_URL_SANDBOX", "https://sandbox.asaas.com/api/v3"),
    webhookToken: envStr("ASAAS_WEBHOOK_TOKEN_SANDBOX") || envStr("ASAAS_WEBHOOK_TOKEN"),
  };
}

// Lê o ambiente Asaas configurado no settings (single source of truth)
async function readAsaasEnvironmentFromSettings(
  supabaseClient: ReturnType<typeof createClient>
): Promise<AsaasEnv> {
  try {
    const { data } = await supabaseClient
      .from("settings")
      .select("asaas_environment")
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .single();
    const env = data?.asaas_environment;
    return env === "production" ? "production" : "sandbox";
  } catch {
    return "sandbox";
  }
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  console.log(`[payment] Request: ${req.method} ${url.pathname}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { order_name, customer, address, items, amount, payment } = body;

    // 1) Define o ambiente: preferência vem do body, fallback do settings
    const requestedEnv: AsaasEnv =
      payment?.environment === "production" || payment?.environment === "sandbox"
        ? payment.environment
        : await readAsaasEnvironmentFromSettings(supabaseClient);

    const cfg = getAsaasConfig(requestedEnv);

    console.log(`[payment] Environment: ${requestedEnv}`);
    console.log(`[payment] API URL: ${cfg.apiUrl}`);
    console.log(`[payment] API Key prefix: ${cfg.apiKey ? cfg.apiKey.substring(0, 12) + "..." : "(MISSING)"}`);

    if (!cfg.apiKey) {
      throw new Error(
        `Chave da API Asaas não configurada para o ambiente "${requestedEnv}". ` +
        `Defina ASAAS_API_KEY_${requestedEnv.toUpperCase()} nos secrets do Supabase.`
      );
    }

    console.log("[payment] Method:", payment?.payment_method);

    // Validate basics
    if (!customer?.email || !customer?.cpf) throw new Error("Dados do cliente incompletos.");
    if (!items?.length) throw new Error("Nenhum item encontrado.");
    if (!payment?.payment_method) throw new Error("Método de pagamento não informado.");

    const cpfClean = customer.cpf.replace(/\D/g, "");
    const phoneClean = customer.phone.replace(/\D/g, "");

    // --- STEP 1: Find or Create Customer in Asaas ---
    console.log(`[payment] Searching for customer with CPF: ${cpfClean}`);
    const customerSearchRes = await fetch(`${cfg.apiUrl}/customers?cpfCnpj=${cpfClean}`, {
      headers: { "access_token": cfg.apiKey }
    });
    const customerSearchResult = await customerSearchRes.json();

    let asaasCustomerId = "";

    if (customerSearchResult.data && customerSearchResult.data.length > 0) {
      asaasCustomerId = customerSearchResult.data[0].id;
      console.log(`[payment] Existing customer found: ${asaasCustomerId}`);
    } else {
      console.log("[payment] Creating new customer in Asaas...");
      const customerCreateRes = await fetch(`${cfg.apiUrl}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": cfg.apiKey
        },
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          cpfCnpj: cpfClean,
          mobilePhone: phoneClean,
          notificationDisabled: true
        })
      });
      const customerCreateResult = await customerCreateRes.json();

      if (!customerCreateRes.ok) {
        throw new Error(`Erro ao criar cliente no Asaas: ${customerCreateResult.errors?.[0]?.description || "Erro desconhecido"}`);
      }

      asaasCustomerId = customerCreateResult.id;
      console.log(`[payment] New customer created: ${asaasCustomerId}`);
    }

    // --- STEP 2: Create Payment ---
    const asaasPayload: any = {
      customer: asaasCustomerId,
      billingType: payment.payment_method === "credit_card" ? "CREDIT_CARD" : "PIX",
      value: amount,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      description: `Pedido ${order_name}`,
      externalReference: order_name,
    };

    if (payment.payment_method === "credit_card") {
      if (!payment.card?.cvv) {
        console.error("[payment] CVV is missing in the request body!");
        throw new Error("Código de segurança (CVV) não recebido pelo servidor.");
      }

      console.log(`[payment] Preparing credit card payload for ${payment.card.holder_name}`);

      asaasPayload.creditCard = {
        holderName: payment.card.holder_name,
        number: payment.card.number,
        expiryMonth: String(payment.card.exp_month).padStart(2, '0'),
        expiryYear: String(payment.card.exp_year),
        ccv: String(payment.card.cvv)
      };
      asaasPayload.creditCardHolderInfo = {
        name: customer.name,
        email: customer.email,
        cpfCnpj: cpfClean,
        postalCode: address.zip.replace(/\D/g, ""),
        addressNumber: address.number || "s/n",
        phone: phoneClean,
        remoteIp: payment.remoteIp || "127.0.0.1"
      };
      if (payment.installments > 1) {
        asaasPayload.installmentCount = payment.installments;
        asaasPayload.totalValue = amount;
        delete asaasPayload.value;
      }
    }

    if (items && items.length > 0) {
      asaasPayload.description = items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ").substring(0, 255);
    }

    console.log("[payment] Creating payment with payload:", JSON.stringify({ ...asaasPayload, creditCard: "MASKED" }, null, 2));

    const paymentRes = await fetch(`${cfg.apiUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": cfg.apiKey
      },
      body: JSON.stringify(asaasPayload)
    });

    const asaasResult = await paymentRes.json();
    console.log("[payment] Asaas Response:", JSON.stringify(asaasResult, null, 2));

    if (!paymentRes.ok) {
      const errorMsg = asaasResult.errors?.[0]?.description || "Erro no processamento do pagamento";
      throw new Error(errorMsg);
    }

    let pixData = null;
    if (payment.payment_method === "pix") {
      console.log(`[payment] Fetching PIX QR Code for payment ${asaasResult.id}`);
      const pixRes = await fetch(`${cfg.apiUrl}/payments/${asaasResult.id}/pixQrCode`, {
        headers: { "access_token": cfg.apiKey }
      });
      pixData = await pixRes.json();
    }

    // --- STEP 3: Save order to DB ---
    const addressWithName = { ...address, name: customer.name };
    const paymentStatusMap: Record<string, string> = {
      "PENDING": "pending",
      "RECEIVED": "paid",
      "CONFIRMED": "paid",
      "OVERDUE": "overdue",
      "REFUNDED": "refunded",
      "RECEIVED_IN_CASH": "paid"
    };

    const paymentStatus = paymentStatusMap[asaasResult.status] || "pending";

    const { error: orderError } = await supabaseClient.from("orders").insert({
      order_name,
      email: customer.email,
      total_price: amount,
      subtotal: items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
      shipping: amount - items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0),
      line_items: items,
      billing_address: addressWithName,
      shipping_address: addressWithName,
      customer_phone: customer.phone,
      customer_cpf: customer.cpf,
      payment_method: payment.payment_method,
      asaas_payment_id: asaasResult.id,
      asaas_customer_id: asaasCustomerId,
      asaas_environment: requestedEnv,
      payment_status: paymentStatus,
      pix_qr_code: pixData?.encodedImage,
      pix_expiration: asaasResult.dueDate,
      financial_status: paymentStatus === "paid" ? "paid" : "pending",
    });

    if (orderError) console.error("[payment] DB insert error (non-fatal):", orderError);

    const result: any = {
      success: true,
      order_id: asaasResult.id,
      status: paymentStatus,
      environment: requestedEnv,
    };

    if (payment.payment_method === "pix") {
      result.pix_qr_code = pixData?.encodedImage;
      result.pix_qr_code_url = pixData?.payload;
      result.pix_expires_at = asaasResult.dueDate;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[payment] Error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro interno ao processar pagamento"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});