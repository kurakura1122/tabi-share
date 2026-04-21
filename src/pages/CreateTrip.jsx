import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Loader2, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';


const AVAILABLE_TAGS = [
  'グルメ', '温泉', '絶景', 'カフェ', '自然', '歴史', 'アクティブ', 'リゾート',
  '神社仏閣', 'ショッピング', 'アート', '夜景', '祭り', '花見'
];

export default function CreateTrip() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // URLパラメータからAI生成データを取得
  const urlParams = new URLSearchParams(window.location.search);
  const aiResultParam = urlParams.get('aiResult');
  const aiTagsParam = urlParams.get('tags');
  const aiResult = aiResultParam ? JSON.parse(decodeURIComponent(aiResultParam)) : null;
  const aiTags = aiTagsParam ? decodeURIComponent(aiTagsParam).split(',').filter(Boolean) : [];

  // AI生成データから日ごとの初期テキストを作成
  const buildInitialDayTexts = (daysCount, aiResult) => {
    const texts = {};
    for (let i = 1; i <= daysCount; i++) {
      if (aiResult?.days) {
        const dayData = aiResult.days.find(d => d.day_index === i);
        texts[i] = dayData
          ? dayData.stops.map(s => `${s.time || ''} ${s.name}${s.description ? ' — ' + s.description : ''}`).join('\n')
          : '';
      } else {
        texts[i] = '';
      }
    }
    return texts;
  };

  const initialDaysCount = aiResult?.days?.length ? parseInt(String(aiResult.days.length)) : 1;

  const [title, setTitle] = useState(aiResult?.title || '');
  const [prefecture, setPrefecture] = useState(aiResult?.prefecture || '');
  const [days, setDays] = useState(aiResult?.days?.length ? String(aiResult.days.length) : '');
  const [dayTexts, setDayTexts] = useState(() => buildInitialDayTexts(initialDaysCount, aiResult));
  const [activeDay, setActiveDay] = useState(1);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [userName, setUserName] = useState('');
  const [selectedTags, setSelectedTags] = useState(aiTags.length > 0 ? aiTags : []);

  const daysCount = parseInt(days) || 1;

  // 日数が変わったとき既存テキストを保持しつつ日数を調整
  useEffect(() => {
    setDayTexts(prev => {
      const updated = {};
      for (let i = 1; i <= daysCount; i++) {
        updated[i] = prev[i] || '';
      }
      return updated;
    });
    if (activeDay > daysCount) setActiveDay(daysCount);
  }, [daysCount]);

  const createMutation = useMutation({
    mutationFn: async (tripData) => {
      const { _dayTexts, _prefecture, ...data } = tripData;
      const trip = await entities.trips.create(data);
      // テキストからスポットを自動抽出してTripStopを保存
      invokeFunction('extractAndSaveStops', {
        tripId: trip.id,
        dayTexts: _dayTexts,
        prefecture: _prefecture,
      });
      return trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['popularTrips'] });
      queryClient.invalidateQueries({ queryKey: ['latestTrips'] });
      toast.success('旅程を投稿しました');
      navigate(createPageUrl('Home'));
    },
    onError: (error) => {
      toast.error('投稿に失敗しました');
      console.error(error);
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await uploadFile(file);
      setThumbnailUrl(file_url);
    } catch {
      toast.error('画像のアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title || !prefecture || !days) {
      toast.error('タイトル、都道府県、日数は必須です');
      return;
    }

    // 日ごとのテキストを結合してdescriptionに保存
    const description = Array.from({ length: daysCount }, (_, i) => {
      const d = i + 1;
      return `${d}日目:\n${dayTexts[d] || ''}`;
    }).join('\n\n');

    createMutation.mutate({
      title,
      prefecture,
      days: parseInt(days),
      tags: selectedTags,
      description,
      thumbnail_url: thumbnailUrl,
      user_name: userName || '匿名',
      likes_count: 0,
      saves_count: 0,
      _dayTexts: dayTexts,
      _prefecture: prefecture,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">旅程を投稿</h1>
        </div>
      </div>

      {/* フォーム */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">タイトル *</Label>
            <Input
              id="title"
              placeholder="例：京都 古都を巡る2泊3日"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prefecture">都道府県 *</Label>
            <Input
              id="prefecture"
              placeholder="例：京都府"
              value={prefecture}
              onChange={(e) => setPrefecture(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="days">日数 *</Label>
            <select
              id="days"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">選択してください</option>
              {[1,2,3,4,5,6].map(d => (
                <option key={d} value={d}>{d}日</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>タグ（任意）</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    selectedTags.includes(tag)
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* 日ごとの旅程入力 */}
          <div className="space-y-2">
            <Label>旅程（日ごと）</Label>
            {/* 日タブ */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Array.from({ length: daysCount }, (_, i) => i + 1).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDay(d)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    activeDay === d
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                  }`}
                >
                  {d}日目
                </button>
              ))}
            </div>
            <Textarea
              placeholder={`${activeDay}日目のスポットや行程を入力\n例：9:00 東京スカイツリー — 展望台からの絶景\n11:00 浅草寺 — 歴史ある参道を散策`}
              rows={4}
              value={dayTexts[activeDay] || ''}
              onChange={(e) => setDayTexts(prev => ({ ...prev, [activeDay]: e.target.value }))}
            />

          </div>

          <div className="space-y-2">
            <Label>旅のイメージ写真</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            {thumbnailUrl ? (
              <div className="relative">
                <img src={thumbnailUrl} alt="サムネイル" className="w-full h-48 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => { setThumbnailUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full h-36 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
              >
                {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
                <span className="text-sm">{isUploading ? 'アップロード中...' : '写真を選択'}</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="userName">投稿者名</Label>
            <Input
              id="userName"
              placeholder="例：旅好きたろう"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                投稿中...
              </>
            ) : (
              '投稿する'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}