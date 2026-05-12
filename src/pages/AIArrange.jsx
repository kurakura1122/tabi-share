import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowLeft, Sparkles, Loader2, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import GeneratedResultCard from '../components/GeneratedResultCard';
import PostSettingsModal from '../components/PostSettingsModal';

export default function AIArrange() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('tripId') || urlParams.get('id');
  
  const [budget, setBudget] = useState('');
  const [daysChange, setDaysChange] = useState('');
  const [purpose, setPurpose] = useState('');
  const [pace, setPace] = useState('');
  const [companion, setCompanion] = useState('');
  const [adultsCount, setAdultsCount] = useState('');
  const [childrenCount, setChildrenCount] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [allowsPets, setAllowsPets] = useState(false);
  const [departureLocation, setDepartureLocation] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [transportation, setTransportation] = useState('');
  const [includeLodging, setIncludeLodging] = useState(true);
  const [includeTransport, setIncludeTransport] = useState(true);
  const [includeMeals, setIncludeMeals] = useState(true);
  const [latestGeneratedResult, setLatestGeneratedResult] = useState(null);
  const [latestGeneratedStops, setLatestGeneratedStops] = useState([]);
  const [latestStopsReady, setLatestStopsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [pendingPostData, setPendingPostData] = useState(null);
  
  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const trips = await entities.trips.list();
      return trips.find(t => t.id === tripId);
    },
    enabled: !!tripId,
  });
  
  const saveMutation = useMutation({
    mutationFn: async (textToSave) => {
      return await entities.savedTrips.create({
        originalTripId: tripId,
        adjustedText: textToSave,
        createdAt: new Date().toISOString(),
        budget: budget,
        daysChange: daysChange,
        purpose: purpose,
        pace: pace,
        companion: companion,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedTrips'] });
      toast.success('保存しました');
      navigate(createPageUrl('TripDetail') + `?id=${tripId}&generated=1`);
    },
  });
  
  const openPostModal = (result, stops) => {
    const defaultDescription = result.days?.map(d => `${d.day_index}日目:\n` + d.stops.map(s => `${s.time || ''} ${s.name}`).join('\n')).join('\n\n') || '';
    setPendingPostData({
      result,
      stops,
      defaultTitle: result.title || trip.title,
      defaultDescription,
      defaultTags: [purpose, pace, companion].filter(Boolean),
    });
    setPostModalOpen(true);
  };

  const handlePost = async ({ title, description, tags, thumbnailUrl, userName }) => {
    if (!pendingPostData) return;
    const { result, stops } = pendingPostData;
    setIsPosting(true);
    try {
      const user = await supabase.auth.getUser().then(r => r.data.user);
      const days = daysChange ? parseInt(daysChange) : trip.days;
      const newTrip = await entities.trips.create({
        title: title || result.title || trip.title,
        prefecture: trip.prefecture,
        days: days,
        tags,
        description,
        thumbnail_url: thumbnailUrl || '',
        user_name: userName || user?.full_name || '匿名',
        user_icon: user?.user_icon || '',
      });
      if (stops && stops.length > 0) {
        await Promise.all(stops.map(stop =>
          entities.TripStop.create({
            ...stop,
            trip_id: newTrip.id,
            variant: 'original',
          })
        ));
      }
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('投稿しました！');
      setPostModalOpen(false);
      navigate(createPageUrl('TripDetail') + `?id=${newTrip.id}`);
    } catch (error) {
      toast.error('投稿に失敗しました');
      console.error(error);
    } finally {
      setIsPosting(false);
    }
  };

  const [tightBudgetWarning, setTightBudgetWarning] = useState(false);

  const handleGenerate = async (adjustMode = null, baseResult = null) => {
  if (!purpose || !pace || !companion) {
    toast.error('目的、ペース、同行者を入力してください');
    return;
  }

  const budgetNum = budget ? parseInt(budget.replace(/[^\d]/g, '')) : null;
  const days = daysChange ? parseInt(daysChange) : trip.days;

  // タイト予算の警告（停止しない）
  if (budgetNum && budgetNum < days * 5000) {
    setTightBudgetWarning(true);
  } else {
    setTightBudgetWarning(false);
  }

    setIsGenerating(true);
    
    try {
      const days = daysChange ? parseInt(daysChange) : trip.days;
      const budgetNum = budget ? parseInt(budget.replace(/[^\d]/g, '')) : null;

      // 交通費を事前に取得
      let transitFareInfo = null;
      if (!adjustMode && departureLocation && trip.prefecture) {
        try {
          const fareRes = await invokeFunction('getTransitFare', {
            origin: departureLocation,
            destination: trip.prefecture,
            departureTime: departureTime || null,
            transportMode: transportation === '車あり' || transportation === 'レンタカー' ? 'driving' : 'transit',
          });
          transitFareInfo = fareRes.data;
        } catch {
          // 取得失敗は無視
        }
      }
      const budgetMin = budgetNum ? Math.round(budgetNum * 0.8) : null;
      const budgetIncludeItems = [
        includeLodging ? '宿代' : null,
        includeTransport ? '交通費' : null,
        includeMeals ? '食事代' : null,
      ].filter(Boolean);
      const budgetExcludeItems = [
        !includeLodging ? '宿代' : null,
        !includeTransport ? '交通費' : null,
        !includeMeals ? '食事代' : null,
      ].filter(Boolean);

      let prompt;

      if (adjustMode && baseResult) {
        const adjustDelta = adjustMode === 'luxury' ? 5000 : adjustMode === 'save' ? -5000 : 0;
        const adjustLabel = adjustMode === 'fit' ? '予算内に収める' : adjustMode === 'luxury' ? `+${adjustDelta.toLocaleString()}円分贅沢にする` : `${adjustDelta.toLocaleString()}円節約する`;
        prompt = `以下の旅程JSONをベースに、金額のみ調整してください。
調整方針: ${adjustLabel}
${budgetNum ? `目標予算: ${budgetNum.toLocaleString()}円` : ''}

【元の旅程JSON】
${JSON.stringify(baseResult)}

【調整ルール】
- stopsのnameやtimeは変えない
- 食事・宿・体験の価格帯のみ変更する
- budget_summaryのみ更新する

【出力形式】同じJSON構造で返すこと`;
      } else {
        // 元の旅程スポットを取得してプロンプトに含める
        const originalStops = await entities.TripStop.filter({ trip_id: tripId, variant: 'original' }, 'order_index');
        const originalStopsByDay = {};
        for (const stop of originalStops) {
          const d = stop.day || 1;
          if (!originalStopsByDay[d]) originalStopsByDay[d] = [];
          originalStopsByDay[d].push(stop.name);
        }
        const originalItineraryText = Object.keys(originalStopsByDay).sort((a, b) => a - b).map(d =>
          `${d}日目: ${originalStopsByDay[d].join(' → ')}`
        ).join('\n');

        // 交通費(往復)の計算
        let transitOnewayFare = 0;
        if (transitFareInfo) {
          if (transitFareInfo.mode === 'driving') {
            // 車: ガソリン代*2 + ETC往復
            const gasCostOneWay = transitFareInfo.gasCost || 0;
            const etcMatch = transitFareInfo.etcFee ? transitFareInfo.etcFee.replace(/[^\d]/g, '') : '0';
            const etcOneWay = parseInt(etcMatch) || 0;
            transitOnewayFare = gasCostOneWay + etcOneWay;
          } else {
            // 電車: fareから数値抽出
            const fareText = transitFareInfo.fare?.text || '';
            const fareMatch = fareText.replace(/[^\d]/g, '');
            transitOnewayFare = parseInt(fareMatch) || 0;
          }
        }
        const transitRoundTrip = transitOnewayFare * 2;

        prompt = `あなたは実在するプロの旅行プランナーです。
以下の【元の旅程】をベースに、ユーザー条件に合わせてアレンジした旅行プランを作成してください。

【旅行エリア】${trip.prefecture}

【元の旅程】（これをベースにアレンジすること）
${originalItineraryText || '（スポット情報なし）'}

【ユーザー条件】
- 予算（合計）: ${budgetNum ? `${budgetNum.toLocaleString()}円` : '指定なし'}${budgetNum ? `（この予算には${budgetIncludeItems.length > 0 ? budgetIncludeItems.join('・') : 'すべての費用'}が含まれています${budgetExcludeItems.length > 0 ? ('。' + budgetExcludeItems.join('・') + 'は含みません') : ''}）` : ''}
- 日数: ${days}日間
- 目的: ${purpose}
- ペース: ${pace}
- 同行者: ${companion}
- 大人の人数: ${adultsCount || '指定なし'}
- 子供の人数: ${childrenCount || '0'}人
- 年代: ${ageRange || '指定なし'}
- 出発希望日: ${departureDate || '指定なし'}
- ペット同伴: ${allowsPets ? '可' : '不可'}
- 出発地: ${departureLocation || '指定なし'}
- 出発時刻: ${departureTime || '指定なし'}
- 移動手段: ${transportation || '指定なし'}
${transitRoundTrip > 0 ? `\n【交通費情報（往復）】\n出発地「${departureLocation}」から「${trip.prefecture}」への往復交通費: 約${transitRoundTrip.toLocaleString()}円\nこの金額をbudget_summaryのtransportに使用すること。` : ''}

【アレンジルール（必ず守ること）】
■ 変えてはいけないもの:
- 日数は${days}日間で固定。1日も増減しないこと
- 各日のエリア・地域は元の旅程から大きく外れないこと（例：1日目が京都なら京都周辺のまま）
- 1日あたりのスポット数は元の旅程の±1以内に収めること
- 元の旅程に空港・主要駅・宿泊施設が含まれる場合、その起点/終点は維持すること
${departureLocation ? `- 1日目の出発地は「${departureLocation}」で固定すること` : ''}

■ アレンジしてよいもの:
- 個々のスポットの入替・追加（目的・ペース・同行者に合わせて）
- スポットの訪問順序の最適化（移動効率を上げる）
- 食事・カフェ・休憩スポットの追加・変更
- ユーザー条件に合わないスポットを適切な代替スポットに変更

【必須ルール】
1. 実在する具体的な施設名のみ使用する（曖昧な名称禁止）
2. 各スポットに1文で魅力説明を入れる（descriptionフィールド）
3. 同じエリア内で移動が効率的になるよう順序を組む
4. ペット同伴可の場合、ペット可の施設のみ選ぶ
${transportation ? `5. 移動手段は「${transportation}」のみ使用すること。${transportation === '車なし' || transportation === '電車・バス' ? '車・レンタカーを使う移動は含めないこと。公共交通機関・徒歩・自転車でアクセスできるスポットのみ選ぶこと。' : transportation === '車あり' || transportation === 'レンタカー' ? '車でのアクセスを前提としたプランにすること。' : ''}` : ''}
${budgetNum ? `${transportation ? '6' : '5'}. 見積もり合計は必ず予算の80〜100%（${budgetMin.toLocaleString()}〜${budgetNum.toLocaleString()}円）に収めること` : ''}

【出力形式】以下のJSON構造で必ず出力すること:
{
  "title": "旅程タイトル",
  "days": [
    {
      "day_index": 1,
      "stops": [
        {
          "name": "施設名（実在する正式名称）",
          "time": "9:00",
          "description": "1文の魅力説明",
          "price": 1500
        }
      ]
    }
  ],
  "packing_list": ["持ち物1", "持ち物2"],
  "budget_summary": {
    "total": 60000,
    "lodging": 20000,
    "transport": 10000,
    "meals": 15000,
    "activities": 10000,
    "other": 5000
  }
}

【予算計算ルール】
- transport: ${transitRoundTrip > 0 ? `「${transitRoundTrip.toLocaleString()}円」を必ず使用すること（往復交通費として計算済み）` : '出発地〜旅行エリアの往復交通費を調べて計算すること'}
- activities: 各stopのpriceフィールドの合計を使用すること（入場料・体験料・有料スポットのみ。無料スポットは0）
- lodging: 宿代の見積もり（1泊あたりの相場 × 泊数）
- meals: 食事代の見積もり（1日あたり3食 × 日数 × 人数）
- total: 上記の合計`;
      }

      const response = await invokeFunction('generateText', { prompt });
      const rawResult = response.data.result;

      // JSONパース
      let parsed;
      try {
        parsed = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
      } catch {
        toast.error('JSONパースに失敗しました');
        return;
      }

      setLatestGeneratedResult(parsed);
      setLatestGeneratedStops([]);
      setLatestStopsReady(false);
      setShowForm(false);

      // 既存のgeneratedストップを削除（自分のものだけ）
      const currentUser = await supabase.auth.getUser().then(r => r.data.user);
      const existingGenerated = await entities.TripStop.filter({ trip_id: tripId, variant: 'generated', created_by: currentUser.email });
      await Promise.all(existingGenerated.map(s => entities.TripStop.delete(s.id)));

      // Places APIでstopを解決しTripStopに保存、かつローカルにも保持
      const resolvedStops = [];
      const savedPlaceIds = new Set(); // place_id重複排除用
      const savedNameDays = new Set(); // name+day重複排除用（place_idなし時）

      for (const day of (parsed.days || [])) {
        let orderIndex = 0; // dayごとにリセット
        for (const stop of (day.stops || [])) {
          try {
            const placeRes = await invokeFunction('resolvePlaces', {
              query: stop.name,
              prefecture: trip.prefecture,
            });
            const place = placeRes.data.places?.[0];
            if (place) {
              // place_idがある場合はplace_idで重複チェック（trip全体で一意）
              // place_idがない場合はname+dayで重複チェック
              if (place.place_id) {
                if (savedPlaceIds.has(place.place_id)) continue;
                savedPlaceIds.add(place.place_id);
              } else {
                const nameDay = `${stop.name}__${day.day_index}`;
                if (savedNameDays.has(nameDay)) continue;
                savedNameDays.add(nameDay);
              }

              const stopData = {
                trip_id: tripId,
                name: stop.name,
                place_id: place.place_id || '',
                lat: place.lat,
                lng: place.lng,
                order_index: orderIndex,
                day: day.day_index,
                memo: stop.description || '',
                variant: 'generated',
              };
              await entities.TripStop.create(stopData);
              resolvedStops.push(stopData);
              orderIndex++;
            }
          } catch {
            // 解決失敗は無視して続行
          }
        }
      }
      setLatestGeneratedStops(resolvedStops);
      setLatestStopsReady(true);

      // 生成履歴に保存
      await entities.generationHistory.create({
        originalTripId: tripId,
        generatedText: JSON.stringify(parsed),
        budget: budget,
        daysChange: daysChange,
        purpose: purpose,
        pace: pace,
        companion: companion,
      });
    } catch (error) {
      toast.error('生成に失敗しました');
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
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-xl font-bold text-gray-900">{trip.title}</h1>
          <p className="text-sm text-gray-600 mt-1">条件を入力して旅程を自分用にアレンジ</p>
        </div>
      </div>
      
      {/* Post Settings Modal */}
      {pendingPostData && (
        <PostSettingsModal
          open={postModalOpen}
          onClose={() => setPostModalOpen(false)}
          onConfirm={handlePost}
          initialData={{
            title: pendingPostData.defaultTitle,
            description: pendingPostData.defaultDescription,
            tags: pendingPostData.defaultTags,
          }}
          isPosting={isPosting}
        />
      )}

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Input Form */}
        {showForm && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="budget">予算（合計）</Label>
            <Input
              id="budget"
              type="text"
              placeholder="例: 60000 または 6万円"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            {budget && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-gray-500">予算に含む項目：</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: '宿代', state: includeLodging, setter: setIncludeLodging },
                    { label: '交通費', state: includeTransport, setter: setIncludeTransport },
                    { label: '食事代', state: includeMeals, setter: setIncludeMeals },
                  ].map(({ label, state, setter }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{label}</span>
                      <Switch checked={state} onCheckedChange={setter} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="days">日数変更</Label>
            <Input
              id="days"
              type="number"
              min="1"
              max="30"
              placeholder={`元: ${trip.days}日間`}
              value={daysChange}
              onChange={(e) => setDaysChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">目的</Label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger id="purpose">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="グルメ">グルメ</SelectItem>
                <SelectItem value="観光">観光</SelectItem>
                <SelectItem value="映え">映え</SelectItem>
                <SelectItem value="ショッピング">ショッピング</SelectItem>
                <SelectItem value="アドベンチャー">アドベンチャー</SelectItem>
                <SelectItem value="文化体験">文化体験</SelectItem>
                <SelectItem value="リラックス">リラックス</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pace">ペース</Label>
            <Select value={pace} onValueChange={setPace}>
              <SelectTrigger id="pace">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ゆったり">ゆったり</SelectItem>
                <SelectItem value="効率重視">効率重視</SelectItem>
                <SelectItem value="アクティブ">アクティブ</SelectItem>
                <SelectItem value="ディープ">ディープ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companion">同行者</Label>
            <Select value={companion} onValueChange={setCompanion}>
              <SelectTrigger id="companion">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="一人旅">一人旅</SelectItem>
                <SelectItem value="友達">友達</SelectItem>
                <SelectItem value="恋人">恋人</SelectItem>
                <SelectItem value="家族">家族</SelectItem>
                <SelectItem value="出張">出張</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="departureDate">出発希望日</Label>
            <Input
              id="departureDate"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                詳細検索
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>詳細検索</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 py-6">
                <div className="space-y-2">
                  <Label htmlFor="adultsCount">大人の人数</Label>
                  <Input
                    id="adultsCount"
                    type="number"
                    min="1"
                    placeholder="例: 2"
                    value={adultsCount}
                    onChange={(e) => setAdultsCount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="childrenCount">子供の人数</Label>
                  <Input
                    id="childrenCount"
                    type="number"
                    min="0"
                    placeholder="例: 1"
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ageRange">年代</Label>
                  <Select value={ageRange} onValueChange={setAgeRange}>
                    <SelectTrigger id="ageRange">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10代">10代</SelectItem>
                      <SelectItem value="20代">20代</SelectItem>
                      <SelectItem value="30代">30代</SelectItem>
                      <SelectItem value="40代">40代</SelectItem>
                      <SelectItem value="50代">50代</SelectItem>
                      <SelectItem value="60代以上">60代以上</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="pets">ペット同伴</Label>
                  <Switch
                    id="pets"
                    checked={allowsPets}
                    onCheckedChange={setAllowsPets}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departure">出発地</Label>
                  <Input
                    id="departure"
                    type="text"
                    placeholder="例: 東京駅、羽田空港"
                    value={departureLocation}
                    onChange={(e) => setDepartureLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">出発時刻</Label>
                  <Input
                    id="time"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transportation">移動手段</Label>
                  <Select value={transportation} onValueChange={setTransportation}>
                    <SelectTrigger id="transportation">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="車あり">車あり</SelectItem>
                      <SelectItem value="車なし">車なし</SelectItem>
                      <SelectItem value="電車・バス">電車・バス</SelectItem>
                      <SelectItem value="飛行機">飛行機</SelectItem>
                      <SelectItem value="レンタカー">レンタカー</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                </div>
                </SheetContent>
                </Sheet>
          
          {tightBudgetWarning && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              ⚠️ かなりタイトな予算です。旅程は生成されますが、現実的な調整が必要になる場合があります。
            </div>
          )}

          <Button 
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-semibold"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                生成する
              </>
            )}
          </Button>
        </div>
        )}
        
        {/* AI Results */}
        {latestGeneratedResult && (
          <div className="space-y-4">
            <Button
              onClick={() => navigate(createPageUrl('TripDetail') + `?id=${tripId}&generated=1`)}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              旅程を確認する →
            </Button>
            {/* Regenerate Button */}
            <Button 
              onClick={() => setShowForm(true)}
              variant="outline"
              className="w-full"
            >
              再生成
            </Button>

            <GeneratedResultCard
              result={latestGeneratedResult}
              index={0}
              totalCount={1}
              stops={latestGeneratedStops}
              stopsReady={latestStopsReady}
              isGenerating={isGenerating}
              budget={budget}
              isSaving={saveMutation.isPending}
              isPosting={isPosting}
              onSave={() => saveMutation.mutate(latestGeneratedResult)}
              onPost={() => openPostModal(latestGeneratedResult, latestGeneratedStops)}
              onAdjust={(mode) => handleGenerate(mode, latestGeneratedResult)}
              trip={trip}
              showOriginal={true}
              compareItinerary={null}
            />
          </div>
        )}
      </div>
    </div>
  );
}