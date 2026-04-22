import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Loader2, History as HistoryIcon, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function History() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(r => r.data.user).then(setCurrentUser).catch(() => {});
  }, []);

  const { data: generationHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['generationHistory', currentUser?.email],
    queryFn: () => entities.generationHistory.filter({ user_id: currentUser.id }, '-created_at', 50),
    enabled: !!currentUser,
    staleTime: 0,
  });
  
  const { data: trips = [], isLoading: isLoadingTrips } = useQuery({
    queryKey: ['trips'],
    queryFn: () => entities.trips.list(),
  });
  
  const isLoading = isLoadingHistory || isLoadingTrips;
  
  const handleHistoryClick = (historyItem) => {
    navigate(createPageUrl('HistoryDetail') + `?id=${historyItem.id}`);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">履歴</h1>
          <p className="text-sm text-gray-500 mt-1">AIで生成した旅程の履歴</p>
        </div>
      </div>
      
      {/* History List */}
      <div className="max-w-md mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : generationHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <HistoryIcon className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              まだ履歴がありません
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {generationHistory.map((historyItem) => {
              const originalTrip = trips.find(t => t.id === historyItem.originalTripId);
              return (
                <div
                  key={historyItem.id}
                  onClick={() => handleHistoryClick(historyItem)}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-gray-900 text-base">
                      {originalTrip?.title || 'タイトルなし'}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {format(new Date(historyItem.created_date), 'MM/dd HH:mm')}
                    </span>
                  </div>
                  
                  {originalTrip && (
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{originalTrip.prefecture}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{historyItem.daysChange || originalTrip.days}日間</span>
                      </div>
                    </div>
                  )}
                  
{(historyItem.purpose || historyItem.pace || historyItem.companion) && (
                    <div className="flex flex-wrap gap-2">
                      {historyItem.purpose && (
                        <Badge variant="secondary" className="text-xs">
                          {historyItem.purpose}
                        </Badge>
                      )}
                      {historyItem.pace && (
                        <Badge variant="outline" className="text-xs">
                          {historyItem.pace}
                        </Badge>
                      )}
                      {historyItem.companion && (
                        <Badge variant="outline" className="text-xs">
                          {historyItem.companion}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}