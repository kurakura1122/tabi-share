import { createClient } from 'jsr:@supabase/supabase-js@2';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { origin, destination, departureTime, transportMode } = await req.json();
    if (!origin || !destination) return Response.json({ error: 'origin and destination are required' }, { status: 400 });

    const isDriving = transportMode === 'driving';

    if (isDriving) {
      const prompt = `「${origin}」から「${destination}」まで車（高速道路利用）で行く場合の情報を以下のJSON形式で返してください:
{"duration":"所要時間","distance":"距離","gasCost":数値,"etcFee":"ETC料金","exitIC":"降りるIC","highway":"高速道路名"}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      const info = JSON.parse(response.choices[0].message.content || '{}');
      return Response.json({ mode: 'driving', ...info });
    } else {
      const prompt = `「${origin}」から「${destination}」まで公共交通機関で行く方法を以下のJSON形式で返してください${departureTime ? `（出発時間: ${departureTime}）` : ''}:
{"duration":"所要時間","fare":"運賃","route":[{"lineName":"路線名","departureStop":"乗る駅","arrivalStop":"降りる駅"}],"transfers":["乗り換え駅"],"summary":"経路説明"}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return Response.json({
        mode: 'transit',
        duration: result.duration,
        fare: result.fare ? { text: result.fare } : null,
        transitLines: result.route || [],
        transfers: result.transfers || [],
        summary: result.summary,
        destinationStation: destination,
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
