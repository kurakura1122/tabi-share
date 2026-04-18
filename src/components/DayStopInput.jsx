import React, { useState, useRef, useEffect } from 'react';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, X, Plus, Loader2 } from 'lucide-react';

export default function DayStopInput({ day, stops, onChange }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const autocompleteService = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    invokeFunction('getMapsApiKey').then(res => {
      setApiKey(res.data.apiKey);
    });
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps?.places) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      return;
    }
    const existing = document.getElementById('gmap-script');
    if (existing) {
      existing.addEventListener('load', () => {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
      });
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmap-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    };
    document.head.appendChild(script);
  }, [apiKey]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => {
      if (!autocompleteService.current) return;
      setIsSearching(true);
      autocompleteService.current.getPlacePredictions(
        { input: val, language: 'ja', componentRestrictions: { country: 'jp' } },
        (results, status) => {
          setIsSearching(false);
          if (status === 'OK') setSuggestions(results || []);
          else setSuggestions([]);
        }
      );
    }, 300);
  };

  const handleSelect = (prediction) => {
    if (!apiKey) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        const newStop = {
          name: prediction.structured_formatting.main_text,
          place_id: prediction.place_id,
          lat: loc.lat(),
          lng: loc.lng(),
          order_index: stops.length,
          day,
        };
        onChange([...stops, newStop]);
      }
    });
    setQuery('');
    setSuggestions([]);
  };

  const handleRemove = (index) => {
    onChange(stops.filter((_, i) => i !== index).map((s, i) => ({ ...s, order_index: i })));
  };

  return (
    <div className="space-y-2">
      {/* 追加済みスポット */}
      {stops.length > 0 && (
        <div className="space-y-1.5">
          {stops.map((stop, i) => (
            <div key={i} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-gray-800 flex-1">{stop.name}</span>
              <button type="button" onClick={() => handleRemove(i)} className="text-gray-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 検索入力 */}
      <div className="relative">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-1 focus-within:ring-blue-400 focus-within:border-blue-400">
          {isSearching ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" /> : <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="スポットを検索して追加..."
            className="flex-1 text-sm outline-none bg-transparent"
          />
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s) => (
              <li
                key={s.place_id}
                onClick={() => handleSelect(s)}
                className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{s.structured_formatting.main_text}</p>
                  <p className="text-xs text-gray-400">{s.structured_formatting.secondary_text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}