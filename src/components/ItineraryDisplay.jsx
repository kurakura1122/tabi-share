import React from 'react';
import { Badge } from '@/components/ui/badge';

function estimateTransit(fromStop, toStop) {
  const fromName = fromStop?.name || '';
  const toName = toStop?.name || '';
  const combined = fromName + toName;
  if (/空港|新幹線|駅/.test(combined)) return { mode: '電車', time: '約30〜60分' };
  if (/山|的|滝|湖|岬|展望/.test(combined)) return { mode: '車', time: '約20〜40分' };
  return { mode: '徒歩', time: '約10〜20分' };
}

function TransitRow({ from, to }) {
  const { mode, time } = estimateTransit(from, to);
  const icon = mode === '徒歩' ? '🚖' : mode === '雷車' ? '🚇' : '🚛';
  return (<div className="flex items-center gap-2 py-1 pl-14 text-xs text-gray-400"><span>{icon} {mode}</span><span>·</span><span>{time}</span></div>);
}

export default function ItineraryDisplay({ itinerary, compareItinerary = null }) {
  const [showCompare, setShowCompare] = React.useState(false);
  if (!itinerary || !itinerary.days) return null;
  const activeItinerary = showCompare && compareItinerary ? compareItinerary : itinerary;
  const hasCompare = !!compareItinerary;
  const originalNames = new Set(itinerary.days.flatMap(d => d.stops.map(s => s.name)));
  const compareNames = compareItinerary ? new Set(compareItinerary.days.flatMap(d => d.stops.map(s => s.name))) : new Set();
  function isNew(n) { return showCompare && compareItinerary && !originalNames.has(n); }
  function isRemoved(n) { return !showCompare && compareItinerary && !compareNames.has(n); }
  return (<div className="space-y-6">{hasCompare && (<div className="flex bg-gray-100 rounded-lg p-1 gap-1"><button onClick={() => setShowCompare(false)} className={`flex-1 text-sm py-1.5 rounded-md font-medium ${!showCompare?'bg-white text-gray-900 shadow-sm':'text-gray-500'}`}>元の旅程</button><button onClick={() => setShowCompare(true)} className={`flex-1 text-sm py-1.5 rounded-md font-medium ${showCompare?'bg-white text-blue-600 shadow-sm':'text-gray-500'}`}>AI提案</button></div>)}{activeItinerary.days.map(day => (<div key={day.day_index}><h3 className="font-bold text-gray-900 text-base mb-3 pb-1 border-b border-gray-200">{day.day_index}日目</h3><div>{day.stops.map((stop,i) => (<React.Fragment key={i}><div className="flex gap-3 py-1 rounded-lg px-1"><div className="flex-shrink-0 text-xs text-gray-500 w-12 pt-0.5 text-right">{stop.time}</div><div className="flex-1"><div className="flex items-center justify-between gap-2"><p className="font-medium text-sm text-gray-900">{stop.name}</p>{stop.price!=null&&stop.price>0&&(<span className="text-xs text-gray-500 flex-shrink-0">¥{stop.price.toLocaleString()}</span>)}</div>{stop.description&&(<p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{stop.description}</p>)}</div></div>{i<day.stops.length-1&&(<TransitRow from={stop} to={day.stops[i+1]}/>)}</React.Fragment>))}</div></div>))}{activeItinerary.budget_summary&&(<div className="bg-gray-50 rounded-lg p-4"><h3 className="font-bold text-gray-900 text-sm mb-2">予算見積'</h3><div className="space-y-1 text-sm"><div className="flex justify-between font-semibold"><span>合計</span><span>{activeItinerary.budget_summary.total?.toLocaleString()}円</span></div></div></div>)}</div>);
}