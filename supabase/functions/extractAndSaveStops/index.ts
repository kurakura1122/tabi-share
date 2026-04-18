import { createClient } from 'jsr:@supabase/supabase-js@2';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
const PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

async function resolvePlace(name: string, prefecture: string) {
  const q = prefecture ? `${name} ${prefecture}` : name;
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY!,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
    },
    body: JSON.stringify({ textQuery: q, maxResultCount: 1, languageCode: 'ja' }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const p = data.places?.[0];
  if (!p) return null;
  return {
    place_id: p.id,
    name: p.displayName?.text || name,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
  };
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tripId, dayTexts, prefecture } = await req.json();
    if (!tripId || !dayTexts) return Response.json({ error: 'tripId and dayTexts are required' }, { status: 400 });

    const allStops: any[] = [];

    for (const [dayStr, text] of Object.entries(dayTexts) as [string, string][]) {
      if (!text?.trim()) continue;
      const day = parseInt(dayStr);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '旗程テキストから訪問する場所・スポット名を順番に抽出してください。スポット名だけをJSON配列で返してください。例: {"spots":["東京スカイツリー","浅草寺"]}',
          },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
      });

      let spotNames: string[] = [];
      try {
        const parsed = JSON.parse(completion.choices[0].message.content || '{}');
        spotNames = parsed.spots || parsed.places || parsed.names || Object.values(parsed)[0] as string[] || [];
      } catch { spotNames = []; }

      if (!Array.isArray(spotNames) || spotNames.length === 0) continue;

      for (let i = 0; i < spotNames.length; i++) {
        const name = spotNames[i];
        if (!name || typeof name !== 'string') continue;
        const resolved = await resolvePlace(name, prefecture);
        if (!resolved) continue;
        allStops.push({
          trip_id: tripId,
          name: resolved.name,
          place_id: resolved.place_id,
          lat: resolved.lat,
          lng: resolved.lng,
          order_index: i,
          day,
          variant: 'original',
          user_id: user.id,
        });
      }
    }

    if (allStops.length > 0) {
      await supabase.from('trip_stops').insert(allStops);
    }

    return Response.json({ success: true, count: allStops.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
