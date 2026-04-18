import React from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
export default function SavedTripCard({ savedTrip, originalTrip, onClick }) {
  return(<Card className="cursor-pointer hover:shadow-lg border-gray-200" onClick={onClick}><CardContent className="p-5"><h3 className="font-bold text-lg text-gray-900 mb-2">{savedTrip.title||originalTrip?.title||'旗程'}</h3><div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3"><Calendar className="w-3.5 h-3.5"/><span>{format(new Date(savedTrip.createdAt||savedTrip.created_date),yyyy/MM/dd HH:mm')}</span></div><p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{savedTrip.adjustedText}</p></CardContent></Card>);
}