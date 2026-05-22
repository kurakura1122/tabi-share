import React from 'react';
import { MapPin, Calendar, Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TripCard({ trip, onClick, compact = false }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-200 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all ${compact ? 'p-3 min-w-[220px]' : 'p-4'}`}
    >
      {/* 場所 & 日数 */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium text-gray-700">{trip.prefecture || '未設定'}</span>
        </div>
        <span className="text-gray-300">·</span>
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>{trip.days}日間</span>
        </div>
      </div>

      {/* タイトル */}
      <h3 className={`font-bold text-gray-900 leading-snug mb-2 ${compact ? 'text-sm line-clamp-2' : 'text-base line-clamp-2'}`}>
        {trip.title}
      </h3>

      {/* タグ */}
      {trip.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {trip.tags.slice(0, compact ? 2 : 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* フッター */}
      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          {trip.user_icon ? (
            <img src={trip.user_icon} alt={trip.user_name} className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
          )}
          <span className="text-xs text-gray-500">{trip.user_name || '匿名'}</span>
        </div>
        {trip.saves_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Bookmark className="w-3.5 h-3.5" />
            <span>{trip.saves_count}</span>
          </div>
        )}
      </div>
    </div>
  );
}
