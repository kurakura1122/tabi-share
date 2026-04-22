import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import SavedTripCard from '../components/SavedTripCard';
import { Loader2, BookmarkX } from 'lucide-react';

export default function MySaved() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(r => r.data.user).then(setCurrentUser).catch(() => {});
    }, []);

  const { data: savedTrips = [], isLoading: isLoadingSaved } = useQuery({
    queryKey: ['savedTrips', currentUser?.email],
    queryFn: () => entities.savedTrips.filter({ user_id: currentUser.id }, '-created_at', 100),
    enabled: !!currentUser,
    staleTime: 0,
  });
  
  const { data: trips = [], isLoading: isLoadingTrips } = useQuery({
    queryKey: ['trips'],
    queryFn: () => entities.trips.list(),
  });
  
  const isLoading = isLoadingSaved || isLoadingTrips;
  
  const handleSavedTripClick = (savedTrip) => {
    navigate(createPageUrl('SavedDetail') + `?id=${savedTrip.id}`);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">保存</h1>
        </div>
      </div>
      
      {/* Saved Trips List */}
      <div className="max-w-md mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : savedTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <BookmarkX className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              保存された旅程
                
                are not found
              </p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedTrips.map((savedTrip) => {
              const originalTrip = trips.find(t => t.id === savedTrip.originalTripId);
              return (
                <SavedTripCard 
                  key={savedTrip.id}
                  savedTrip={savedTrip}
                  originalTrip={originalTrip}
                  onClick={() => handleSavedTripClick(savedTrip)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}