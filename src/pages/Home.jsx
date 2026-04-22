import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import TripCard from '../components/TripCard';
import { Search, Plus, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AISearchModal from '../components/AISearchModal';

const CATEGORIES = [
  'すべて', 'グルメ', '温泉', '絶景', 'カフェ', '自然', '歴史', 'アクティブ', 'リゾート'
];

export default function Home() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAISearch, setShowAISearch] = useState(false);

  // 人気の旅程（保存数降順、上位10件）
  const { data: popularTrips = [], isLoading: isLoadingPopular } = useQuery({
    queryKey: ['popularTrips', selectedCategory, searchQuery],
    queryFn: async () => {
      const query = {};
      if (selectedCategory !== 'すべて') {
        query.tags = selectedCategory;
      }
      if (searchQuery) {
        const allTrips = await entities.trips.list('-saves_count', 200);
        return allTrips.filter(trip => {
          const categoryMatch = selectedCategory === 'すべて' || trip.tags?.includes(selectedCategory);
          const searchMatch = 
            trip.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.prefecture?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
            trip.days?.toString().includes(searchQuery);
          return categoryMatch && searchMatch;
        }).slice(0, 10);
      }
      return await entities.trips.filter(query, '-saves_count', 10);
    },
  });

  // 新着の旅程（投稿日降順、上位10件）
  const { data: latestTrips = [], isLoading: isLoadingLatest } = useQuery({
    queryKey: ['latestTrips', selectedCategory, searchQuery],
    queryFn: async () => {
      const query = {};
      if (selectedCategory !== 'すべて') {
        query.tags = selectedCategory;
      }
      if (searchQuery) {
        const allTrips = await entities.trips.list('-created_date', 200);
        return allTrips.filter(trip => {
          const categoryMatch = selectedCategory === 'すべて' || trip.tags?.includes(selectedCategory);
          const searchMatch = 
            trip.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.prefecture?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            trip.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
            trip.days?.toString().includes(searchQuery);
          return categoryMatch && searchMatch;
        }).slice(0, 10);
      }
      return await entities.trips.filter(query, '-created_date', 10);
    },
  });

  // 人気タグの動的生成（直近200件から集計）
  const { data: allTripsForTags = [] } = useQuery({
    queryKey: ['tripsForTags'],
    queryFn: () => entities.trips.list('-created_date', 200),
  });

  const popularTags = useMemo(() => {
    const tagCounts = {};
    allTripsForTags.forEach(trip => {
      trip.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + (trip.saves_count || 0);
      });
    });
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [allTripsForTags]);

  const isLoading = isLoadingPopular || isLoadingLatest;

  const handleTripClick = (trip) => {
    navigate(createPageUrl('TripDetail') + `?id=${trip.id}`);
  };

  const handleTagClick = (tag) => {
    navigate(createPageUrl('TagTrips') + `?tag=${encodeURIComponent(tag)}`);
  };

  const formatCount = (count) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-900">TabiShare</h1>
            <Button
              onClick={() => navigate(createPageUrl('CreateTrip'))}
              size="sm"
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-4"
            >
              <Plus className="w-4 h-4 mr-1" />
              投稿
            </Button>
          </div>

          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="旅程を検索（例：京都 温泉）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 rounded-full border-gray-300 bg-gray-50 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* カテゴリタブ */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* フィルター状態表示 */}
      {(searchQuery || selectedCategory !== 'すべて') && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">絞り込み中:</span>
            {selectedCategory !== 'すべて' && (
              <span className="flex items-center gap-1 text-xs bg-gray-900 text-white px-3 py-1 rounded-full">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('すべて')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchQuery && (
              <span className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1 rounded-full">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* コンテンツ */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* 人気タグ */}
            {popularTags.length > 0 && !searchQuery && selectedCategory === 'すべて' && (
              <section>
                <h2 className="text-base font-bold text-gray-900 mb-3">🔖 人気のタグ</h2>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {popularTags.map(([tag, count]) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedCategory(tag)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm bg-white border border-gray-200 text-gray-700 hover:border-gray-400 transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 人気の旅程 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">🔥 今人気の旅程</h2>
                <span className="text-xs text-gray-400">{popularTrips.length}件</span>
              </div>
              {popularTrips.length === 0 ? (
                <p className="text-gray-400 text-center py-10 text-sm">旅程が見つかりませんでした</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {popularTrips.map((trip) => (
                    <div key={trip.id} className="min-w-[220px] max-w-[260px] flex-shrink-0">
                      <TripCard trip={trip} onClick={() => handleTripClick(trip)} compact />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 区切り */}
            <div className="border-t border-gray-200" />

            {/* 新着の旅程 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">🆕 新着の旅程</h2>
                <span className="text-xs text-gray-400">{latestTrips.length}件</span>
              </div>
              {latestTrips.length === 0 ? (
                <p className="text-gray-400 text-center py-10 text-sm">旅程が見つかりませんでした</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {latestTrips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} onClick={() => handleTripClick(trip)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* AI検索モーダル */}
      {showAISearch && <AISearchModal onClose={() => setShowAISearch(false)} />}
    </div>
  );
}