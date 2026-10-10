import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phoneNumber, credits } = await req.json()
    const amount = (parseInt(credits) || 1) * 500;
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '255' + cleanPhone.substring(1);
    
    const clickpesaApiKey = Deno.env.get('CLICKPESA_API_KEY');
    if (!clickpesaApiKey) throw new Error("ClickPesa API key not configured on server.");

    const orderReference = "ORD-" + Math.random().toString(36).substring(7).toUpperCase();

    // Call ClickPesa API
    const response = await fetch('https://api.clickpesa.com/v1/payments/ussd-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clickpesaApiKey}` 
      },
      body: JSON.stringify({
        phoneNumber: cleanPhone,
        amount: amount,
        currency: "TZS",
        orderReference: orderReference,
        description: `Bongomus - ${credits} Credits`
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Failed to initiate ClickPesa payment");

    // Insert pending transaction to database
    await supabaseClient.from('transactions').insert({
        id: orderReference,
        user_id: user.id,
        status: 'pending'
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactionId: orderReference,
        message: "Payment initiated" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 })
  }
})
