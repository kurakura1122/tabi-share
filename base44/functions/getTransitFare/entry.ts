import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { origin, destination, departureTime, transportMode } = await req.json();
    if (!origin || !destination) {
      return Response.json({ error: 'origin and destination are required' }, { status: 400 });
    }

    const isDriving = transportMode === 'driving';

    if (isDriving) {
      const drivingInfo = await base44.integrations.Core.InvokeLLM({
        prompt: `${origin} from ${destination}`,
        add_context_from_internet: true,
      });
      return Response.json({ mode: 'driving', ...drivingInfo });
    } else {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${origin} to ${destination}`,
        add_context_from_internet: true,
      });
      return Response.json({ mode: 'transit', ...result });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});