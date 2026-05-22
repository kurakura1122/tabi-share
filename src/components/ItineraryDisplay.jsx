import React from 'react';
import { Badge } from '@/components/ui/badge';

// 移動手段をAI推定（徒歩/電車/車）
function estimateTransit(fromStop, toStop) {
  const fromName = fromStop?.name || '';
  const toName = toStop?.name || '';
  const combined = fromName + toName;

  if (/空港|新幹線|駅/.test(combined)) {
    return { mode: '電車', time: '約30〜60分' };
  }
  if (/山|滝|湖|岬|展望/.test(combined)) {
    return { mode: '車', time: '約20〜40分' };
  }
  return { mode: '徒歩', time: '約10〜20分' };
}

function TransitRow({ from, to }) {
  const { mode, time } = estimateTransit(from, to);
  const icon = mode === '徒歩' ? '🚶' : mode === '電車' ? '🚃' : '🚗';
  return (
    <div className="flex items-center gap-2 py-1 pl-14 text-xs text-gray-400">
      <span>{icon} {mode}</span>
      <span>·</span>
      <span>{time}</span>
    </div>
  );
}

export default function ItineraryDisplay({ itinerary, compareItinerary = null }) {
  const [showCompare, setShowCompare] = React.useState(false);

  if (!itinerary || !itinerary.days) return null;

  const activeItinerary = showCompare && compareItinerary ? compareItinerary : itinerary;
  const hasCompare = !!compareItinerary;

  // 比較時: AIのスポット名セット（ハイライト用）
  const originalNames = new Set(
    itinerary.days.flatMap(d => d.stops.map(s => s.name))
  );
  const compareNames = compareItinerary
    ? new Set(compareItinerary.days.flatMap(d => d.stops.map(s => s.name)))
    : new Set();

  function isNew(stopName) {
    if (!showCompare || !compareItinerary) return false;
    // AI提案側で表示中のとき、元にないスポットが「+」
    return !originalNames.has(stopName);
  }

  function isRemoved(stopName) {
    if (showCompare || !compareItinerary) return false;
    // 元を表示中のとき、AI提案にないスポットはグレー
    return !compareNames.has(stopName);
  }

  return (
    <div className="space-y-6">
      {/* Toggle */}
      {hasCompare && (
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setShowCompare(false)}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
              !showCompare ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            元の旅程
          </button>
          <button
            onClick={() => setShowCompare(true)}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
              showCompare ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            AI提案
          </button>
        </div>
      )}

      {/* Days */}
      {activeItinerary.days.map((day) => (
        <div key={day.day_index}>
          <h3 className="font-bold text-gray-900 text-base mb-3 pb-1 border-b border-gray-200">
            {day.day_index}日目
          </h3>
          <div>
            {day.stops.map((stop, i) => {
              const newSpot = isNew(stop.name);
              const removedSpot = isRemoved(stop.name);
              return (
                <React.Fragment key={i}>
                  <div className="flex gap-3 py-1 rounded-lg px-1">
                    <div className="flex-shrink-0 text-xs text-gray-500 w-12 pt-0.5 text-right">
                      {stop.time}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900">{stop.name}</p>
                        {stop.price != null && stop.price > 0 && (
                          <span className="text-xs text-gray-500 flex-shrink-0">¥{stop.price.toLocaleString()}</span>
                        )}
                      </div>
                      {stop.description && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{stop.description}</p>
                      )}
                    </div>
                  </div>
                  {/* 移動行 */}
                  {i < day.stops.length - 1 && (
                    <TransitRow from={stop} to={day.stops[i + 1]} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}

      {/* Budget */}
      {activeItinerary.budget_summary && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 text-sm mb-2">予算見積もり</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between font-semibold">
              <span>合計</span>
              <span>{activeItinerary.budget_summary.total?.toLocaleString()}円</span>
            </div>
            {[
              { key: 'lodging', label: '宿' },
              { key: 'transport', label: '交通' },
              { key: 'meals', label: '食事' },
              { key: 'activities', label: '観光・体験' },
              { key: 'other', label: 'その他' },
            ].map(({ key, label }) =>
              activeItinerary.budget_summary[key] != null ? (
                <div key={key} className="flex justify-between text-gray-600">
                  <span>{label}</span>
                  <span>{activeItinerary.budget_summary[key].toLocaleString()}円</span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Packing list */}
      {activeItinerary.packing_list?.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-2">持ち物リスト</h3>
          <div className="flex flex-wrap gap-1.5">
            {activeItinerary.packing_list.map((item, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
