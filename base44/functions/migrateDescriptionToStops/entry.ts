import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const results = [];

  // 1. 全Trip取得
  const trips = await base44.asServiceRole.entities.trips.list();

  for (const trip of trips) {
    if (!trip.description || trip.description.trim() === '') {
      results.push({ tripId: trip.id, title: trip.title, status: 'skipped_no_description' });
      continue;
    }

    const existingStops = await base44.asServiceRole.entities.TripStop.filter({
      trip_id: trip.id,
      variant: 'original',
    });
    if (existingStops.length > 0) {
      results.push({ tripId: trip.id, title: trip.title, status: 'skipped_already_migrated', stopCount: existingStops.length });
      continue;
    }

    let places = [];
    try {
      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `${trip.description}`,
        response_json_schema: { type: 'object', properties: { stops: { type: 'array' } } }
      });
      places = llmRes?.stops || [];
    } catch (e) {
      results.push({ tripId: trip.id, title: trip.title, status: 'error_llm', error: e.message });
      continue;
    }

    results.push({ tripId: trip.id, title: trip.title, status: 'migrated' });
  }

  return Response.json({ total: trips.length, results });
});