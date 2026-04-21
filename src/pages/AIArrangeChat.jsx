import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function AIArrangeChat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('id');
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [finalItinerary, setFinalItinerary] = useState(null);
  const messagesEndRef = useRef(null);
  
  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const trips = await entities.trips.list();
      return trips.find(t => t.id === tripId);
    },
    enabled: !!tripId,
  });
  
  useEffect(() => {
    if (trip && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `こんにちは！「${trip.title}」の旅程をあなた好みにアレンジします。\n\n例えば以下のようなご要望をお聞かせください：\n- 予算を5万円以内に抑えたい\n- 3日間に延長したい\n- グルメ重視で回りたい\n- 家族連れで楽しめる内容にしたい\n- ペット同伴可能な施設を含めたい\n\nどのようにアレンジしましょうか？`
      }]);
    }
  }, [trip, messages.length]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const saveMutation = useMutation({
    mutationFn: async () => {
      return await entities.savedTrips.create({
        originalTripId: tripId,
        adjustedText: finalItinerary,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedTrips'] });
      toast.success('保存しました');
      navigate(createPageUrl('MySaved'));
    },
  });
  
  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsGenerating(true);
    
    try {
      const conversationHistory = messages.map(m => 
        `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`
      ).join('\n\n');
      
      const prompt = `あなたは親切な旅行プランナーです。ユーザーと対話しながら旅程をカスタマイズします。

【元の旅程情報】
タイトル: ${trip.title}
エリア: ${trip.area}
日数: ${trip.days}日間
カテゴリ: ${trip.category || '未設定'}
予算: ${trip.budget ? `約${trip.budget}円` : '未設定'}
詳細:
${trip.itineraryText}

【これまでの会話】
${conversationHistory}

【ユーザーの最新の要望】
${userMessage}

【指示】
1. ユーザーの要望を理解し、具体的な質問があれば答える
2. 旅程を生成する段階なら、以下のルールで詳細な旅程を作成：
   - 実在する施設名・店名のみ使用
   - 各日を「1日目」「2日目」形式で記載
   - 各スポットに時間帯（9:00-11:30など）を明記
   - 移動時間と移動手段を記載
   - 観光地の営業時間とWebサイトURLを記載（Web検索で最新情報を取得）
   - 予算の内訳を詳細に記載
   - 持ち物リストを含める
   - 各スポットの魅力を1文で説明

3. まだ情報が足りない場合は、追加で質問する

自然な会話形式で応答してください。`;
      
      const result = await invokeFunction('generateText', {
        prompt: prompt,
        
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
      
      if (result.includes('1日目') || result.includes('【旅程】')) {
        setFinalItinerary(result);
        
        await entities.generationHistory.create({
          originalTripId: tripId,
          generatedText: result,
        });
      }
    } catch (error) {
      toast.error('エラーが発生しました');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500 mb-4">旅程が見つかりませんでした</p>
        <Button onClick={() => navigate(createPageUrl('Explore'))}>
          探すに戻る
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">戻る</span>
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">{trip.title}</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">AIと会話しながらプランを作成</p>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-w-md mx-auto w-full px-4 py-6 pb-32">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <ReactMarkdown className="text-sm prose prose-sm max-w-none">
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-20 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          {finalItinerary && (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full mb-3 bg-green-600 hover:bg-green-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  この旅程を保存
                </>
              )}
            </Button>
          )}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="メッセージを入力..."
              disabled={isGenerating}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              size="icon"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}