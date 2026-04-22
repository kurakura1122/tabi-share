import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Trash2, Sparkles } from 'lucide-react';
import ItineraryDisplay from '../components/ItineraryDisplay';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SavedDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const savedId = urlParams.get('id');
  
  const { data: savedTrips = [], isLoading: isLoadingSaved } = useQuery({
    queryKey: ['savedTrips'],
    queryFn: () => entities.savedTrips.list(),
  });
  
  const { data: trips = [], isLoading: isLoadingTrips } = useQuery({
    queryKey: ['trips'],
    queryFn: () => entities.trips.list(),
  });
  
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await entities.savedTrips.delete(savedId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedTrips'] });
      toast.success('削除しました');
      navigate(createPageUrl('MySaved'));
    },
  });
  
  const isLoading = isLoadingSaved || isLoadingTrips;
  const savedTrip = savedTrips.find(s => s.id === savedId);
  const originalTrip = savedTrip ? trips.find(t => t.id === savedTrip.originalTripId) : null;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (!savedTrip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500 mb-4">保存された旅程が見つかりませんでした</p>
        <Button onClick={() => navigate(createPageUrl('MySaved'))}>
          保存に戻る
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
            onClick={() => navigate(createPageUrl('MySaved'))}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">戻る</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {savedTrip.title || originalTrip?.title || '保存された旅程'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {format(new Date(savedTrip.createdAt || savedTrip.created_date), 'yyyy年MM月dd日 HH:mm')}
          </p>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Generation Conditions */}
        {(savedTrip.budget || savedTrip.purpose || savedTrip.pace || savedTrip.companion) && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">生成条件</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {savedTrip.budget && (
                <div>
                  <span className="text-gray-500">予算:</span>
                  <span className="ml-2 text-gray-900">{savedTrip.budget}</span>
                </div>
              )}
              {savedTrip.daysChange && (
                <div>
                  <span className="text-gray-500">日数:</span>
                  <span className="ml-2 text-gray-900">{savedTrip.daysChange}日間</span>
                </div>
              )}
              {savedTrip.purpose && (
                <div>
                  <span className="text-gray-500">目的:</span>
                  <span className="ml-2 text-gray-900">{savedTrip.purpose}</span>
                </div>
              )}
              {savedTrip.pace && (
                <div>
                  <span className="text-gray-500">ペース:</span>
                  <span className="ml-2 text-gray-900">{savedTrip.pace}</span>
                </div>
              )}
              {savedTrip.companion && (
                <div>
                  <span className="text-gray-500">同行者:</span>
                  <span className="ml-2 text-gray-900">{savedTrip.companion}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Generated Itinerary */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-4">AIが作成した旅程</h2>
          <ItineraryDisplay itinerary={(() => {
            try { return typeof savedTrip.adjustedText === 'string' ? JSON.parse(savedTrip.adjustedText) : savedTrip.adjustedText; }
            catch { return null; }
          })()} />
          {/* JSONパース失敗時はテキストで表示 */}
          {(() => {
            try { JSON.parse(savedTrip.adjustedText); return null; }
            catch { return <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">{savedTrip.adjustedText}</p>; }
          })()}
        </div>

        {/* Original Itinerary */}
        {originalTrip && (
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h2 className="font-bold text-gray-900 mb-4">元の旅程</h2>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">
              {originalTrip.itineraryText}
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <Button 
            onClick={() => navigate(createPageUrl('AIArrange') + `?id=${savedTrip.originalTripId}`)}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            この旅程から再生成
          </Button>
          
          <Button 
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                削除中...
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5 mr-2" />
                削除する
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}