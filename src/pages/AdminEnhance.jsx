import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AdminEnhance() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [enhancingId, setEnhancingId] = useState(null);
  const [enhancedIds, setEnhancedIds] = useState(new Set());
  const [isEnhancingAll, setIsEnhancingAll] = useState(false);
  const [allProgress, setAllProgress] = useState({ done: 0, total: 0 });

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips-admin'],
    queryFn: () => entities.trips.list('-created_date', 100),
  });

  const enhanceOne = async (tripId) => {
    setEnhancingId(tripId);
    try {
      await invokeFunction('enhanceOneDescription', { tripId });
      setEnhancedIds(prev => new Set([...prev, tripId]));
      queryClient.invalidateQueries({ queryKey: ['trips-admin'] });
      toast.success('旅程メモを強化しました');
    } catch (err) {
      toast.error('強化に失敗しました');
    } finally {
      setEnhancingId(null);
    }
  };

  const enhanceAll = async () => {
    setIsEnhancingAll(true);
    setAllProgress({ done: 0, total: trips.length });
    for (const trip of trips) {
      try {
        await invokeFunction('enhanceOneDescription', { tripId: trip.id });
        setEnhancedIds(prev => new Set([...prev, trip.id]));
        setAllProgress(prev => ({ ...prev, done: prev.done + 1 }));
      } catch {
        setAllProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }
    }
    queryClient.invalidateQueries({ queryKey: ['trips-admin'] });
    toast.success('全ての旅程メモ AI強化しました');
    setIsEnhancingAll(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button onClick={() => navigate(createPageUrl('Home'))} className="flex items-center gap-2 text-gray-600 mb-3">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">ホームへ</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900">旅程メモ AI強化</h1>
          <p className="text-sm text-gray-500 mt-1">既存の旅程メモをAIで詳細・魅力的に書き直します</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 一括ボタン */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <Button
            onClick={enhanceAll}
            disabled={isEnhancingAll || trips.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isEnhancingAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                強化中... ({allProgress.done}/{allProgress.total})
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                全ての旅程を一括強化する
              </>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => (
              <div key={trip.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{trip.title}</span>
                      {enhancedIds.has(trip.id) && (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{trip.prefecture} · {trip.days}日間</p>
                    {trip.description ? (
                      <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{trip.description}</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1.5 italic">説明なし</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => enhanceOne(trip.id)}
                    disabled={enhancingId === trip.id || isEnhancingAll}
                    className="flex-shrink-0"
                  >
                    {enhancingId === trip.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}