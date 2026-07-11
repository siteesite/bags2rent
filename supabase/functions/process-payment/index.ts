import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Production Asaas API - chave e URL vêm dos Secrets do Supabase
const ASAAS_API_KEY = (Deno.env.get("ASAAS_API_KEY") || "").replace(/^["']|["']$/g, "").trim();
const ASAAS_API_URL = (Deno.env.get("ASAAS_API_URL") || "https://api.asaas.com/v3").replace(/^["']|["']$/g, "").trim();

serve(async (req: Request) => {
  const url = new URL(req.url);
  console.log(`[payment] Asaas Request: ${req.method} ${url.pathname}`);
  console.log(`[payment] API URL: ${ASAAS_API_URL}`);
  console.log(`[payment] API Key prefix: ${ASAAS_API_KEY.substring(0, 15)}...`);
  
  // Handle CORS
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

    console.log("[payment] Method:", payment?.payment_method);

    // Validate basics
    if (!customer?.email || !customer?.cpf) throw new Error("Dados do cliente incompletos.");
    if (!items?.length) throw new Error("Nenhum item encontrado.");
    if (!payment?.payment_method) throw new Error("Método de pagamento não informado.");

    const cpfClean = customer.cpf.replace(/\D/g, "");
    const phoneClean = customer.phone.replace(/\D/g, "");

    // --- STEP 1: Find or Create Customer in Asaas ---
    console.log(`[payment] Searching for customer with CPF: ${cpfClean}`);
    const customerSearchRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${cpfClean}`, {
      headers: { "access_token": ASAAS_API_KEY }
    });
    const customerSearchResult = await customerSearchRes.json();
    
    let asaasCustomerId = "";

    if (customerSearchResult.data && customerSearchResult.data.length > 0) {
      asaasCustomerId = customerSearchResult.data[0].id;
      console.log(`[payment] Existing customer found: ${asaasCustomerId}`);
    } else {
      console.log("[payment] Creating new customer in Asaas...");
      const customerCreateRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": ASAAS_API_KEY
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
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // 1 day from now
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
      // Installments
      if (payment.installments > 1) {
        asaasPayload.installmentCount = payment.installments;
        asaasPayload.totalValue = amount; // Asaas handles splitting the total
        delete asaasPayload.value;
      }
    }

    // Explicitly add items with truncation to avoid the 52-character limit error
    if (items && items.length > 0) {
      // Asaas API v3 uses 'description' instead of 'name' for line items
      // and 'code' has a 52 char limit.
      // Note: We only send items if it's a single payment (no installments) 
      // or if we want to provide detailed breakdown.
      asaasPayload.description = items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ").substring(0, 255);
    }

    console.log("[payment] Creating payment with payload:", JSON.stringify({ ...asaasPayload, creditCard: "MASKED" }, null, 2));
    
    const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY
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
      const pixRes = await fetch(`${ASAAS_API_URL}/payments/${asaasResult.id}/pixQrCode`, {
        headers: { "access_token": ASAAS_API_KEY }
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
      payment_status: paymentStatus,
      pix_qr_code: pixData?.encodedImage,
      pix_expiration: asaasResult.dueDate, // Asaas doesn't give a specific PIX expiry in the main payload usually
      financial_status: paymentStatus === "paid" ? "paid" : "pending",
    });

    if (orderError) console.error("[payment] DB insert error (non-fatal):", orderError);

    const result: any = {
      success: true,
      order_id: asaasResult.id,
      status: paymentStatus,
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
