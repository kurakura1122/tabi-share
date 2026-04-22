import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, Calendar, MapPin, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import TripMap from '../components/TripMap';

function estimateTransit(from, to) {
  const combined = (from?.name || '') + (to?.name || '');
  if (/空港|新幹線|駅/.test(combined)) return { mode: '電車', time: '約30〜60分', icon: '🚃' };
  if (/山|滝|湖|岬|展望/.test(combined)) return { mode: '車', time: '約20〜40分', icon: '🚗' };
  return { mode: '徒歩', time: '約10〜20分', icon: '🚶' };
}

export default function TripDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('id');

  const showGenerated = urlParams.get('generated') === '1';
  const [activeVariant, setActiveVariant] = useState(showGenerated ? 'generated' : 'original');
  const [selectedDay, setSelectedDay] = useState(1);
  const [showGeneratedTab, setShowGeneratedTab] = useState(showGenerated);
  const [currentUser, setCurrentUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(r => r.data.user).then(setCurrentUser).catch(() => {});
  }, []);

  const handleDelete = async () => {
    if (!window.confirm('この投稿を削除しますか？')) return;
    setIsDeleting(true);
    const stops = await entities.TripStop.filter({ trip_id: tripId });
    await Promise.all(stops.map(s => entities.TripStop.delete(s.id)));
    await entities.trips.delete(tripId);
    toast.success('削除しました');
    navigate(createPageUrl('Home'));
  };

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const trips = await entities.trips.list();
      return trips.find(t => t.id === tripId);
    },
    enabled: !!tripId,
  });

  const { data: stops = [] } = useQuery({
    queryKey: ['tripStops', tripId, activeVariant, currentUser?.email],
    queryFn: () => {
      if (activeVariant === 'generated' && currentUser) {
        return entities.TripStop.filter({ trip_id: tripId, variant: 'generated', user_id: currentUser?.id }, 'order_index');
      }
      return entities.TripStop.filter({ trip_id: tripId, variant: activeVariant }, 'order_index');
    },
    enabled: !!tripId && (activeVariant === 'original' || !!currentUser),
  });

  const { data: allStops = [] } = useQuery({
    queryKey: ['tripStopsAll', tripId, currentUser?.email],
    queryFn: async () => {
      const originals = await entities.TripStop.filter({ trip_id: tripId, variant: 'original' }, 'order_index');
      if (!currentUser) return originals;
      const generated = await entities.TripStop.filter({ trip_id: tripId, variant: 'generated', user_id: currentUser?.id }, 'order_index');
      return [...originals, ...generated];
    },
    enabled: !!tripId,
  });

  const hasOriginal = useMemo(() => allStops.some(s => s.variant === 'original'), [allStops]);

  const days = useMemo(() => {
    const daySet = [...new Set(stops.map(s => s.day).filter(Boolean))].sort((a, b) => a - b);
    return daySet.length > 0 ? daySet : [];
  }, [stops]);

  const filteredStops = useMemo(() => {
    if (days.length === 0) return stops;
    return stops.filter(s => s.day === selectedDay);
  }, [stops, selectedDay, days]);

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
      {/* Map - top 45% */}
      <div className="sticky top-0 z-30" style={{ height: '45vh' }}>
        <TripMap stops={filteredStops} prefecture={trip?.prefecture} />
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky z-40" style={{ top: '45vh' }}>
        <div className="max-w-md mx-auto px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">戻る</span>
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">{trip.title}</h1>
            {currentUser && trip.user_id === currentUser?.id && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-red-400 hover:text-red-600 transition-colors"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
            )}
          </div>
          {/* Variant Tabs */}
          <div className="flex gap-2 mt-3">
            {['original', ...(showGeneratedTab ? ['generated'] : [])].map(v => (
              <button
                key={v}
                onClick={() => { setActiveVariant(v); setSelectedDay(1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeVariant === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {v === 'original' ? '元の旅程' : 'AI提案'}
              </button>
            ))}
          </div>
          {/* Day Tabs */}
          {days.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedDay === day
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day}日目
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span>{trip.prefecture}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{trip.days}日間</span>
          </div>
        </div>
        
        {/* Tags */}
        {trip.tags && trip.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {trip.tags.map((tag, index) => (
              <Badge 
                key={index}
                variant="secondary"
                className="bg-blue-50 text-blue-700 text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Stop List for selected day */}
        {filteredStops.length > 0 && (
          <div className="bg-white rounded-lg p-5 mb-6 shadow-sm border border-gray-200">
            <h2 className="font-bold text-gray-900 mb-3">スポット</h2>
            <div>
              {filteredStops.map((stop, i) => {
                const next = filteredStops[i + 1];
                const transit = estimateTransit(stop, next);
                return (
                  <React.Fragment key={stop.id || i}>
                    <div className="flex gap-3 py-1">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{stop.name}</p>
                        {stop.memo && <p className="text-xs text-gray-500 mt-0.5">{stop.memo}</p>}
                      </div>
                    </div>
                    {next && (
                      <div className="flex items-center gap-2 py-1 pl-8 text-xs text-gray-400">
                        <span>{transit.icon} {transit.mode}</span>
                        <span>·</span>
                        <span>{transit.time}</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* フォールバック: originalStopsが存在しない場合のみdescriptionを表示 */}
        {activeVariant === 'original' && !hasOriginal && trip.description && (() => {
          // "N日目:\n..."形式にパース
          const dayPattern = /(\d+)日目[:：]\n?([\s\S]*?)(?=\n*\d+日目[:：]|$)/g;
          const parsedDays = [];
          let match;
          while ((match = dayPattern.exec(trip.description)) !== null) {
            parsedDays.push({ day: parseInt(match[1]), text: match[2].trim() });
          }

          if (parsedDays.length > 1) {
            return (
              <div className="bg-white rounded-lg p-5 mb-6 shadow-sm border border-gray-200">
                <h2 className="font-bold text-gray-900 mb-3">旅程メモ</h2>
                {/* 日タブ */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                  {parsedDays.map(({ day }) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selectedDay === day
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {day}日目
                    </button>
                  ))}
                </div>
                {parsedDays.filter(d => d.day === selectedDay).map(({ day, text }) => (
                  <p key={day} className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                    {text || '（内容なし）'}
                  </p>
                ))}
              </div>
            );
          }

          // パースできない場合はそのみみ表示
          return (
            <div className="bg-white rounded-lg p-5 mb-6 shadow-sm border border-gray-200">
              <h2 className="font-bold text-gray-900 mb-3">旅程メモ</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {trip.description}
              </p>
            </div>
          );
        })()}
        
        {/* Action Button */}
        <Button 
          onClick={() => navigate(createPageUrl('AIArrange') + `?tripId=${trip.id}`)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-semibold"
          size="lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          ✨ AIでこの旅程をアレンジ
        </Button>
      </div>
    </div>
  );
}