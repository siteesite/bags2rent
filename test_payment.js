const fetch = require('node-fetch');

async function test() {
  const payload = {
    order_name: "C2R-TEST1234",
    customer: {
      name: "Paulo Tarso",
      email: "test@example.com",
      cpf: "12345678909",
      phone: "11999999999"
    },
    address: {
      street: "Rua Teste",
      number: "123",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      zip: "01001000"
    },
    items: [
      {
        id: "prod_1",
        name: "Vestido Teste",
        price: 150,
        quantity: 1
      }
    ],
    amount: 150,
    payment: {
      payment_method: "pix"
    }
  };

  const res = await fetch("https://uggofsioqvqcnpwmnznp.supabase.co/functions/v1/process-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZ29mc2lvcXZxY25wd21uem5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzY1ODAsImV4cCI6MjA5MDY1MjU4MH0.dvHU-fSQ-zA3nQA_OZ10UY9D_G-4p24ryW_H4SIuCPk"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log(res.status, text);
}

test();
