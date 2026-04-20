import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai@4.77.0';

const openai = new OpenAI({
  apiKey: Deno.env.get("tripper-key"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await req.json();
    
    if (!prompt) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "あなたは日本の旅行プランナーです。ユーザーの要望に基づいて、詳細で実行可能な旅行プランを日本語で作成してください。必ずJSON形式で出力してください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const result = response.choices[0].message.content;

    return Response.json({ result });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});