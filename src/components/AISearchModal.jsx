import React, { useState } from 'react';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { X, Sparkles, Loader2, ArrowLeft, Bookmark, Check, Wand2, Send, MapPin, Train } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

const PREFECTURES = [
  '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
  '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
  '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知',
  '三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山',
  '鳥取', '島根', '岡山', '広島', '山口',
  '徳島', '香川', '愛媛', '高知',
  '福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄',
];

const DAYS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7'];

const DEPARTURE_TIMES = [
  '6:00', '7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00',
];

const TRANSPORT_MODES = [
  { value: 'transit', label: '🚃 電車・バス' },
  { value: 'driving', label: '🚗 車' },
  { value: 'walking', label: '🚶 徒歩中心' },
  { value: 'mixed', label: '🔀 組み合わせ' },
];

const TAGS = [
  'グルメ', '観光', '映え', 'ショッピング', 'アドベンチャー',
  '文化体験', 'リラックス', '温泉', '自然', '歴史', 'カフェ', '絶景', 'リゾート', 'アクティブ',
];

export default function AISearchModal({ onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [prefecture, setPrefecture] = useState('');
  const [days, setDays] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [budget, setBudget] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [transportMode, setTransportMode] = useState('');
  const [origin, setOrigin] = useState('');
  const [fareInfo, setFareInfo] = useState(null);
  const [isFetchingFare, setIsFetchingFare] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTripId, setSavedTripId] = useState(null);
  const [arrangeNote, setArrangeNote] = useState('');
  const [isArranging, setIsArranging] = useState(false);

  const hasSelection = prefecture || days || selectedTags.length > 0;



  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      const user = await supabase.auth.getUser().then(r => r.data.user);
      const daysCount = days ? parseInt(days) : (result.days?.length || 2);
      const generatedText = result.days?.map(d =>
        `${d.day_index}日目:\n` + d.stops.map(s => `${s.time || ''} ${s.name}`).join('\n')
      ).join('\n\n');
      const saved = await entities.savedTrips.create({
        originalTripId: '',
        adjustedText: generatedText,
        createdAt: new Date().toISOString(),
        budget: budget || '',
        daysChange: String(daysCount),
        purpose: selectedTags[0] || '',
        companion: '',
        title: result.title,
        prefecture: result.prefecture || prefecture,
      });
      setSavedTripId(saved.id);
      queryClient.invalidateQueries({ queryKey: ['savedTrips'] });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArrange = async () => {
    if (!arrangeNote.trim() || !result) return;
    setIsArranging(true);
    setSavedTripId(null);
    try {
      const currentPlan = result.days?.map(d =>
        `${d.day_index}日目:\n` + d.stops.map(s => `  ${s.time || ''} ${s.name} — ${s.description || ''}`).join('\n')
      ).join('\n\n');

      const prompt = `あなたはプロの旅行プランナーです。以下の旅程をユーザーのリクエストに従って編集してください。

【現在の旅程】
タイトル: ${result.title}
${currentPlan}

【ユーザーのリクエスト】
${arrangeNote}

【ルール】
- 実在する具体的な施設名のみ使用すること
- 各スポットに1文の魅力説明（descriptionフィールド）を入れること
- 移動効率を考慮すること
- リクエストに応じて旅程を変更・追加・削除すること

【出力形式】以下のJSON構造のみで出力すること（説明文不要）:
{
  "title": "旅程タイトル",
  "prefecture": "${result.prefecture || prefecture}",
  "days": [
    {
      "day_index": 1,
      "stops": [
        { "name": "施設名", "time": "9:00", "description": "1文の魅力説明", "budget": 1000 }
      ]
    }
  ],
  "budget_summary": {
    "total": 50000,
    "lodging": 15000,
    "transport": 10000,
    "meals": 15000,
    "activities": 10000,
    "other": 0
  }
}`;

      const response = await invokeFunction('generateText', { prompt });
      const raw = response.data.result;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setResult(parsed);
      setArrangeNote('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsArranging(false);
    }
  };

  const fetchFare = async (destination) => {
    if (!origin.trim() || !destination) return;
    setIsFetchingFare(true);
    setFareInfo(null);
    try {
      const res = await invokeFunction('getTransitFare', {
        origin: origin.trim(),
        destination,
        departureTime: departureTime || undefined,
        transportMode: transportMode || 'transit',
      });
      setFareInfo(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingFare(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);
    setSavedTripId(null);
    try {
      const prompt = `あなたはプロの旅行プランナーです。以下の条件で旅行プランを作成してください。

【条件】
- 行き先: ${prefecture || '指定なし（日本国内の魅力的な場所）'}
- 日数: ${days ? days + '日間' : '指定なし（2〜3日で）'}
- テーマ・目的: ${selectedTags.length > 0 ? selectedTags.join('・') : '指定なし'}
- 予算: ${budget ? budget + '円以内' : '指定なし（自由）'}
- 初日の出発時間: ${departureTime || '指定なし（朝9時頃を想定）'}
- 移動手段: ${transportMode ? TRANSPORT_MODES.find(m => m.value === transportMode)?.label : '指定なし（最適な手段で）'}

【ルール】
- 実在する具体的な施設名のみ使用すること
- 各スポットに1文の魅力説明（descriptionフィールド）を入れること
- 移動効率を考慮してスポット順序を組　こと
- 指定された移動手段に合わせてスポット間の移動を考慮すること
- 初日は指定された出発時間からスケジュールを組　こと

【出力形式】以下のJSON構造のみで出力すること（説明文不要）:
{
  "title": "旅程タイトル",
  "prefecture": "都道府県名",
  "days": [
    {
      "day_index": 1,
      "stops": [
        { "name": "施設名", "time": "9:00", "description": "1文の魅力説明", "budget": 1000 }
      ]
    }
  ],
  "budget_summary": {
    "total": 50000,
    "lodging": 15000,
    "transport": 10000,
    "meals": 15000,
    "activities": 10000,
    "other": 0
  }
}`;

      const response = await invokeFunction('generateText', { prompt });
      const raw = response.data.result;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setResult(parsed);

      // 生成履歴を保存
      await entities.generationHistory.create({
        originalTripId: '',
        generatedText: JSON.stringify(parsed),
        budget: budget || '',
        daysChange: days || '',
        purpose: selectedTags[0] || '',
        pace: '',
        companion: '',
      });
      queryClient.invalidateQueries({ queryKey: ['generationHistory'] });

      if (origin.trim()) {
        // 車・電車どちらも初日1番目のスポットを目的地に
        const firstStop = parsed.days?.[0]?.stops?.[0]?.name;
        fetchFare(firstStop || parsed.prefecture);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // 生成結果画面
  if (result || isGenerating) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ height: '100dvh' }}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setResult(null)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">条件に戻る</span>
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-5">
          {isGenerating || isArranging ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p className="text-gray-600 font-medium">{isArranging ? 'AIが旅程を編集中...' : 'AIが旅程を作成中...'}</p>
              <p className="text-sm text-gray-400">
                {[prefecture, days ? days + '日間' : '', ...selectedTags].filter(Boolean).join(' · ')}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              <h2 className="text-xl font-bold text-gray-900">{result.title}</h2>
              <div className="flex flex-wrap gap-1.5">
                {prefecture && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">📍 {result.prefecture || prefecture}</span>}
                {days && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">📅 {days}日間</span>}
                {selectedTags.map(t => (
                  <span key={t} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">#{t}</span>
                ))}
              </div>

              {result.days?.map(day => (
                <div key={day.day_index} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-bold text-blue-700 mb-3">{day.day_index}日目</p>
                  <div className="space-y-3">
                    {day.stops?.map((stop, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                          {i < day.stops.length - 1 && <div className="w-0.5 bg-blue-200 flex-1 mt-1" />}
                        </div>
                        <div className="pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-10">{stop.time}</span>
                            <span className="font-semibold text-gray-900 text-sm">{stop.name}</span>
                          </div>
                          {stop.description && (
                            <p className="text-xs text-gray-500 mt-0.5 ml-12">{stop.description}</p>
                          )}
                          {stop.budget > 0 && (
                            <p className="text-xs text-amber-600 font-medium mt-0.5 ml-12">💴 約{stop.budget.toLocaleString()}円</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* 運賃情報 */}
              {origin && (isFetchingFare || fareInfo) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1">
                    <Train className="w-4 h-4" />
                    出発地からの交通情報
                  </p>
                  {isFetchingFare ? (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      運賃を取得中...
                    </div>
                  ) : fareInfo?.error ? (
                    <p className="text-sm text-red-500">{fareInfo.error}</p>
                  ) : fareInfo?.mode === 'driving' ? (
                    <div className="space-y-1 text-sm text-blue-900">
                      <p>📍 {origin} → {fareInfo?.destinationStation || result.prefecture || prefecture}</p>
                      {fareInfo?.duration && <p>⏱ 所要時間: <span className="font-semibold">{fareInfo.duration}</span></p>}
                      {fareInfo?.distance && <p>📏 距離: <span className="font-semibold">{fareInfo.distance}</span></p>}
                      <p>⛽ ガソリン代目安: <span className="font-bold text-blue-700 text-base">約{fareInfo.gasCost?.toLocaleString()}円</span></p>
                      <p className="text-xs text-blue-500">※燃費15km/L、ガソリン175円/Lで計算</p>
                      {fareInfo?.highway && <p className="mt-1">🛣️ 高速道路: <span className="font-semibold">{fareInfo.highway}</span></p>}
                      {fareInfo?.exitIC && <p>🚗 降りるIC: <span className="font-semibold">{fareInfo.exitIC}</span></p>}
                      {fareInfo?.etcFee && <p>💳 ETC料金目安: <span className="font-bold text-blue-700 text-base">{fareInfo.etcFee}</span></p>}
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm text-blue-900">
                      <p>📍 {origin} → {fareInfo?.destinationStation || result.prefecture || prefecture}</p>
                      {fareInfo?.duration && <p>⏱ 所要時間: <span className="font-semibold">{fareInfo.duration}</span></p>}
                      {fareInfo?.distance && <p>📏 距離: <span className="font-semibold">{fareInfo.distance}</span></p>}
                      {fareInfo?.fare ? (
                        <p>💴 運賃: <span className="font-bold text-blue-700 text-base">{fareInfo.fare.text}</span></p>
                      ) : (
                        <p className="text-xs text-blue-600">※ 運賃情報が取得できませんでした</p>
                      )}
                      {fareInfo?.transitLines?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-semibold text-blue-700">🚃 乗車路線</p>
                          {fareInfo.transitLines.map((line, i) => (
                            <p key={i} className="text-xs pl-2">・<span className="font-semibold">{line.lineName}</span>（{line.departureStop} → {line.arrivalStop}）</p>
                          ))}
                        </div>
                      )}
                      {fareInfo?.transfers?.length > 0 && (
                        <p className="text-xs text-blue-700 mt-1">🔄 乗り換え: <span className="font-semibold">{fareInfo.transfers.join(' → ')}</span></p>
                      )}
                      {fareInfo?.summary && (
                        <p className="text-xs text-blue-600 mt-1 italic">{fareInfo.summary}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {result.budget_summary?.total > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2">予算目安</p>
                  <p className="text-2xl font-bold text-amber-900">{result.budget_summary.total.toLocaleString()}円</p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-amber-700">
                    {result.budget_summary.lodging > 0 && <span>宿泊: {result.budget_summary.lodging.toLocaleString()}円</span>}
                    {result.budget_summary.transport > 0 && <span>交通: {result.budget_summary.transport.toLocaleString()}円</span>}
                    {result.budget_summary.meals > 0 && <span>食事: {result.budget_summary.meals.toLocaleString()}円</span>}
                    {result.budget_summary.activities > 0 && <span>体験: {result.budget_summary.activities.toLocaleString()}円</span>}
                  </div>
                </div>
              )}

              {/* アレンジセクション（スクロール内） */}
              <div className="border border-blue-100 rounded-xl bg-blue-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <Wand2 className="w-3.5 h-3.5" />
                  この旅程をアレンジ
                </p>
                <textarea
                  value={arrangeNote}
                  onChange={e => setArrangeNote(e.target.value)}
                  placeholder="例：3日目を温泉中心にしてほしい、予算を下げたい、カフェをもっと入れて..."
                  className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                  rows={2}
                />
                <Button
                  onClick={handleArrange}
                  disabled={!arrangeNote.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  AIで編集する
                </Button>
              </div>
            </div>
          )}
        </div>

        {!isGenerating && !isArranging && result && (
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 bg-white space-y-2">
            {savedTripId ? (
              <Button
                onClick={() => { onClose(); navigate(createPageUrl('SavedDetail') + `?id=${savedTripId}`); }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                保存済み — 旅程を見る
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bookmark className="w-4 h-4 mr-2" />}
                {isSaving ? '保存中...' : 'この旅程を保存'}
              </Button>
            )}
            <Button
              onClick={() => {
                const encoded = encodeURIComponent(JSON.stringify(result));
                onClose();
                navigate(createPageUrl('CreateTrip') + `?aiResult=${encoded}&tags=${encodeURIComponent(selectedTags.join(','))}`);
              }}
              variant="outline"
              className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <Send className="w-4 h-4 mr-2" />
              この旅程を投稿
            </Button>
            <Button
              onClick={handleGenerate}
              variant="outline"
              className="w-full border-gray-300 text-gray-600 hover:bg-gray-50"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              別の旅程を作成
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 条件選択画面
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          AIで旅程を作成
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 min-h-0">
        {/* 都道府県 & 日数 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 mb-2">行き先（都道府県）</p>
            <select
              value={prefecture}
              onChange={e => setPrefecture(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">未指定</option>
              {PREFECTURES.map(pref => (
                <option key={pref} value={pref}>{pref}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 mb-2">日数</p>
            <select
              value={days}
              onChange={e => setDays(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">未指定</option>
              {DAYS_OPTIONS.map(d => (
                <option key={d} value={d}>{d}日</option>
              ))}
            </select>
          </div>
        </div>

        {/* 初日の出発時間 & 移動手段 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 mb-2">初日の出発時間</p>
            <select
              value={departureTime}
              onChange={e => setDepartureTime(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">未指定</option>
              {DEPARTURE_TIMES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 mb-2">移動手段</p>
            <select
              value={transportMode}
              onChange={e => setTransportMode(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">未指定</option>
              {TRANSPORT_MODES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 出発地 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">出発地（任意）</p>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              placeholder="例: 東京都渋谷区、大阪駅"
              className="flex-1 h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-6">入力すると旅程生成後に交通費を表示します</p>
        </div>

        {/* 予算 */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">予算（任意）</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="例: 50000"
              className="w-40 h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span className="text-sm text-gray-500">円以内（未入力は自由）</span>
          </div>
        </div>

        {/* タグ */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">テーマ（複数選択可）</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 検索開始ボタン：何か選択したときだけ表示 */}
      {hasSelection && (
        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 bg-white space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {prefecture && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">📍 {prefecture}</span>}
            {days && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">📅 {days}日間</span>}
            {departureTime && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">🕗 {departureTime}出発</span>}
            {transportMode && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">{TRANSPORT_MODES.find(m => m.value === transportMode)?.label}</span>}
            {selectedTags.map(t => (
              <span key={t} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">#{t}</span>
            ))}
          </div>
          <Button
            onClick={handleGenerate}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-semibold rounded-xl"
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            この条件で旅程を作成
          </Button>
        </div>
      )}
    </div>
  );
}