import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

serve(async (req) => {
  try {
    const payload = await req.json()
    // payload structure assumed from standard gateways: { orderReference, status, amount }
    
    if (!payload.orderReference) {
      return new Response("Missing order reference", { status: 400 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if payment was successful
    if (payload.status === 'SUCCESS' || payload.state === 'COMPLETED' || payload.status === 'COMPLETED') {
       
       // Update transaction to completed
       const { data: txn, error } = await supabaseAdmin
           .from('transactions')
           .update({ status: 'completed' })
           .eq('id', payload.orderReference)
           .select()
           .single()
           
       if (error || !txn) {
           console.error("Transaction update error:", error)
           return new Response("Transaction error", { status: 500 })
       }

       // Give user the credits they paid for
       const { data: profile } = await supabaseAdmin.from('profiles').select('credits').eq('id', txn.user_id).single()
       
       // Assuming fixed 500 TZS per credit. If amount is in payload, use it, else default to 1 credit.
       const creditsBought = payload.amount ? Math.floor(payload.amount / 500) : 1;

       await supabaseAdmin.from('profiles').update({ 
           credits: (profile?.credits || 0) + creditsBought
       }).eq('id', txn.user_id)
       
       return new Response(JSON.stringify({ received: true, updated: true }), { status: 200 })
    }

    // Payment failed or pending
    if (payload.status === 'FAILED') {
        await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('id', payload.orderReference)
    }

    return new Response(JSON.stringify({ received: true, status: 'processed' }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
