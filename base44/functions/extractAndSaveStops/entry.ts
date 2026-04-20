import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
const PLACES_API_KEY = Deno.env.get('place');

apync function resolvePlace(name, prefecture) {
  const q = prefecture ? `${name} ${prefecture}` : name;
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
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