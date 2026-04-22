import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ItineraryDisplay from '../components/ItineraryDisplay';

export default function HistoryDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const historyId = urlParams.get('id');
  
  const { data: historyItems = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['generationHistory'],
    queryFn: () => entities.generationHistory.list(),
  });
  
  const { data: trips = [], isLoading: isLoadingTrips } = useQuery({
    queryKey: ['trips'],
    queryFn: () => entities.trips.list(),
  });
  
  const isLoading = isLoadingHistory || isLoadingTrips;
  const historyItem = historyItems.find(h => h.id === historyId);
  const originalTrip = trips.find(t => t.id === historyItem?.originalTripId);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (!historyItem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <p className="text-gray-500 mb-4">履歴が見つかりませんでした</p>
        <Button onClick={() => navigate(createPageUrl('History'))}>
          履歴に戻る
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
            onClick={() => navigate(createPageUrl('History'))}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">履歴に戻る</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {originalTrip?.title || '旅程詳細'}
          </h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Generation Conditions */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3">生成条件</h2>
          <div className="flex flex-wrap gap-2">
            {historyItem.purpose && (
              <Badge className="bg-blue-100 text-blue-800">
                目的: {historyItem.purpose}
              </Badge>
            )}
            {historyItem.pace && (
              <Badge className="bg-green-100 text-green-800">
                ペース: {historyItem.pace}
              </Badge>
            )}
            {historyItem.companion && (
              <Badge className="bg-purple-100 text-purple-800">
                同行者: {historyItem.companion}
              </Badge>
            )}
            {historyItem.budget && (
              <Badge className="bg-yellow-100 text-yellow-800">
                予算: {historyItem.budget}
              </Badge>
            )}
            {historyItem.daysChange && (
              <Badge className="bg-pink-100 text-pink-800">
                日数: {historyItem.daysChange}日間
              </Badge>
            )}
          </div>
        </div>
        
        {/* Generated Itinerary */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <h2 className="font-bold text-gray-900 mb-3">生成された旅程</h2>
          {(() => {
            try {
              const parsed = typeof historyItem.generatedText === 'string'
                ? JSON.parse(historyItem.generatedText)
                : historyItem.generatedText;
              return <ItineraryDisplay itinerary={parsed} />;
            } catch {
              return <p className="text-sm text-gray-500">旗程データを読み込めませんでした</p>;
            }
          })()}
        </div>
        
        {/* Original Itinerary */}
        {originalTrip && (
          <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
            <h2 className="font-bold text-gray-900 mb-3">元の旅程</h2>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">
              {originalTrip.itineraryText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}