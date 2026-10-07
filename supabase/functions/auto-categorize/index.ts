import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record // The newly inserted track

    if (!record || !record.title) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 })
    }

    // Connect to Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch available genres from DB
    const { data: genres } = await supabaseClient.from('genres').select('name')
    const genreNames = genres?.map(g => g.name).join(', ') || 'Bongo Flava, Amapiano, Afrobeats, Singeli, Gospel, Hip-hop, Taarab'

    // Call Gemini to guess the genre based on title, artist, and description
    const prompt = `You are a music expert. Categorize the following track into exactly ONE of these genres: ${genreNames}. 
    Track Title: ${record.title}
    Artist: ${record.artist_name}
    Description: ${record.description || 'N/A'}
    Respond with ONLY the exact name of the genre from the list.`

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    const aiData = await aiResponse.json()
    let predictedGenre = aiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!predictedGenre) {
      predictedGenre = "Bongo Flava" // Fallback
    }

    // Update the track with the guessed genre
    await supabaseClient
      .from('tracks')
      .update({ genre: predictedGenre })
      .eq('id', record.id)

    return new Response(JSON.stringify({ success: true, genre: predictedGenre }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
