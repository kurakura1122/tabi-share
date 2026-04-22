import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const trips = await base44.asServiceRole.entities.trips.list();
    const results = [];

    for (const trip of trips) {
      try {
        const currentDesc = trip.description || '';
        const prompt = `あなたはプロの旅行ライターです。
以下の旅程情報をもとに、魅力的で詳細な旅程メモを日本語で書いてください。

【タイトル】${trip.title}
【エリア】${trip.prefecture}
【日数】${trip.days}日間
【タグ】${(trip.tags || []).join('、')}
【現在の説明】${currentDesc || '（なし）'}

【要件】
- 各日のおすすめスポット・食事・移動を具体的に描写する
- 旅の雰囲気や見どころを生き生きと伝える
- 実在する施設・地名を使う
- 400〜600文字程度で書く
- 改行を使って読みやすく整形する（各日を見出しで区切るなど）
- 旅行者が実際に行きたくなるような文体にする`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "あなたは魅力的な旅行記を書くプロのライターです。" },
            { role: "user", content: prompt }
          ],
          max_tokens: 800,
        });

        const enhanced = response.choices[0].message.content;
        await base44.asServiceRole.entities.trips.update(trip.id, { description: enhanced });
        results.push({ id: trip.id, title: trip.title, status: 'ok' });
      } catch (err) {
        results.push({ id: trip.id, title: trip.title, status: 'error', error: err.message });
      }
    }

    return Response.json({ results, total: trips.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});