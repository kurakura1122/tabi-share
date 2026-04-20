import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { batch_size = 5, skip = 0 } = await req.json().catch(() => ({}));

    const allTrips = await base44.asServiceRole.entities.trips.list('-created_date', 50);
    const trips = allTrips.slice(skip, skip + batch_size);
    const updates = [];

    for (const trip of trips) {
      const prompt = `${trip.title} ${trip.prefecture}`;
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt, n: 1, size: '1024x1024',
      });
      const imageUrl = response.data?.[0]?.url;
      if (imageUrl) {
        await base44.asServiceRole.entities.trips.update(trip.id, { thumbnail_url: imageUrl });
        updates.push({ id: trip.id, title: trip.title });
      }
    }

    return Response.json({ success: true, updated_count: updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});