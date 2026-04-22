import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import TripCard from '../components/TripCard';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TagTrips() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const tag = urlParams.get('tag');

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['tagTrips', tag],
    queryFn: async () => {
      if (!tag) return [];
      const allTrips = await entities.trips.list('-saves_count', 100);
      return allTrips.filter(trip => trip.tags?.includes(tag));
    },
    enabled: !!tag,
  });

  const handleTripClick = (trip) => {
    navigate(createPageUrl('TripDetail') + `?id=${trip.id}`);
  };

  if (!tag) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">タグが指定されていません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            #{tag}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {trips.length}滶の旅程
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">このタグの旅程はまだありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map((trip) => (
              <TripCard 
                key={trip.id} 
                trip={trip} 
                onClick={() => handleTripClick(trip)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}