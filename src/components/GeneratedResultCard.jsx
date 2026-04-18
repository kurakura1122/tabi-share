import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Upload } from 'lucide-react';
import TripMap from './TripMap';
import ItineraryDisplay from './ItineraryDisplay';

export default function GeneratedResultCard({
  result,
  index,
  totalCount,
  stops,
  stopsReady,
  isGenerating,
  budget,
  isSaving,
  isPosting,
  onSave,
  onPost,
  onAdjust,
  trip,
  showOriginal,
  compareItinerary,
}) {
  const [selectedDay, setSelectedDay] = useState(1);

  // dayフィールドでグループ化 (day: 1, 2, 3...)
  const days = stops ? [...new Set(stops.map(s => s.day).filter(Boolean))].sort((a, b) => a - b) : [];
  const filteredStops = stops ? stops.filter(s => s.day === selectedDay) : [];
  const mapStops = days.length > 0 ? filteredStops : stops;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 地図 + 日別タブ */}
      {!stopsReady ? (
        <div style={{ height: '240px' }} className="bg-gray-100 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-gray-500">地図を読み込み中...</span>
        </div>
      ) : stops?.length > 0 ? (
        <div>
          {/* 日別タブ */}
          {days.length > 1 && (
            <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-200 px-2 pt-2 gap-1">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
                    selectedDay === day
                      ? 'bg-white border border-b-white border-gray-200 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {day}日目
                </button>
              ))}
            </div>
          )}
          <div style={{ height: '220px' }}>
            <TripMap stops={mapStops} prefecture={trip?.prefecture} />
          </div>
        </div>
      ) : null}

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">生成結果 {totalCount - index}</h2>
          <div className="flex gap-2">
            <Button
              onClick={onPost}
              disabled={isPosting}
              size="sm"
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              {isPosting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              投稿
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          </div>
        </div>

        {/* 日別スポットリスト */}
        {stopsReady && days.length > 1 && filteredStops.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500">{selectedDay}日目のスポット</p>
            {filteredStops.map((stop, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-800">{stop.name}</p>
                  {stop.memo && <p className="text-gray-500 text-xs">{stop.memo}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-6">
          <ItineraryDisplay itinerary={result} compareItinerary={compareItinerary} />
        </div>

        {/* 予算調整ボタン */}
        {budget && (
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs text-gray-500 font-medium">予算を調整して再生成：</p>
            <div className="flex flex-col gap-2">
              {['fit', 'luxury', 'save'].map((mode) => (
                <Button
                  key={mode}
                  variant="outline"
                  size="sm"
                  className="w-full text-sm"
                  disabled={isGenerating}
                  onClick={() => onAdjust(mode)}
                >
                  {isGenerating && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  {mode === 'fit' ? '予算内に収める' : mode === 'luxury' ? 'もう少し贅沢にする（+5,000円）' : 'もっと節約する（-5,000円）'}
                </Button>
              ))}
            </div>
          </div>
        )}

        {showOriginal && trip?.description && (
          <div className="border-t border-gray-200 pt-6">
            <h2 className="font-bold text-gray-900 mb-3">元の旅程</h2>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">{trip.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}