import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, prefecture } = await req.json();

    if (!query) {
      return Response.json({ error: 'query is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('place');
    if (!apiKey) {
      return Response.json({ error: 'Places API key not configured' }, { status: 500 });
    }

    const searchQuery = prefecture ? `${query} ${prefecture}` : query;

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress',
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 3,
        languageCode: 'ja',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return Response.json({ error: `Places API error: ${err}` }, { status: response.status });
    }

    const data = await response.json();
    const places = (data.places || []).map((p) => ({
      place_id: p.id,
      name: p.displayName?.text || '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      formattedAddress: p.formattedAddress || '',
    }));

    return Response.json({ places });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});