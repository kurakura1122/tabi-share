import React, { useEffect, useRef } from 'react';
import { entities, uploadFile, invokeFunction } from '@/api/entities';
import { supabase } from '@/lib/supabaseClient';

// グローバルキャッシュ
let cachedApiKey = null;
let scriptLoaded = false;
let scriptLoading = false;
let onLoadCallbacks = [];

function loadGoogleMaps(apiKey) {
  return new Promise((resolve) => {
    if (window.google) { resolve(); return; }
    if (scriptLoaded) { resolve(); return; }
    onLoadCallbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      onLoadCallbacks.forEach(cb => cb());
      onLoadCallbacks = [];
    };
    document.head.appendChild(script);
  });
}

// 都道府県名 → 代表座標
const PREFECTURE_COORDS = {
  '北海道': { lat: 43.0642, lng: 141.3469 },
  '青森': { lat: 40.8247, lng: 140.7400 },
  '岩手': { lat: 39.7036, lng: 141.1527 },
  '宮城': { lat: 38.2688, lng: 140.8721 },
  '秋田': { lat: 39.7186, lng: 140.1023 },
  '山形': { lat: 38.2404, lng: 140.3634 },
  '福島': { lat: 37.7503, lng: 140.4676 },
  '茨城': { lat: 36.3418, lng: 140.4468 },
  '栃木': { lat: 36.5657, lng: 139.8836 },
  '群馬': { lat: 36.3912, lng: 139.0608 },
  '埼玉': { lat: 35.8572, lng: 139.6489 },
  '千葉': { lat: 35.6047, lng: 140.1233 },
  '東京': { lat: 35.6895, lng: 139.6917 },
  '神奈川': { lat: 35.4478, lng: 139.6425 },
  '新潟': { lat: 37.9026, lng: 139.0235 },
  '富山': { lat: 36.6953, lng: 137.2113 },
  '石川': { lat: 36.5947, lng: 136.6256 },
  '福井': { lat: 36.0652, lng: 136.2216 },
  '山梨': { lat: 35.6635, lng: 138.5684 },
  '長野': { lat: 36.6513, lng: 138.1810 },
  '岐阜': { lat: 35.3912, lng: 136.7223 },
  '静岡': { lat: 34.9769, lng: 138.3831 },
  '愛知': { lat: 35.1802, lng: 136.9066 },
  '三重': { lat: 34.7303, lng: 136.5086 },
  '滋賀': { lat: 35.0045, lng: 135.8686 },
  '京都': { lat: 35.0116, lng: 135.7681 },
  '大阪': { lat: 34.6937, lng: 135.5023 },
  '兵庫': { lat: 34.6913, lng: 135.1830 },
  '奈良': { lat: 34.6851, lng: 135.8329 },
  '和歌山': { lat: 34.2260, lng: 135.1675 },
  '鳥取': { lat: 35.5036, lng: 134.2383 },
  '島根': { lat: 35.4722, lng: 133.0505 },
  '岡山': { lat: 34.6617, lng: 133.9344 },
  '広島': { lat: 34.3853, lng: 132.4553 },
  '山口': { lat: 34.1860, lng: 131.4706 },
  '徳島': { lat: 34.0658, lng: 134.5593 },
  '香川': { lat: 34.3401, lng: 134.0434 },
  '愛媛': { lat: 33.8416, lng: 132.7657 },
  '高知': { lat: 33.5597, lng: 133.5311 },
  '福岡': { lat: 33.5904, lng: 130.4017 },
  '佐賀': { lat: 33.2494, lng: 130.2988 },
  '長崎': { lat: 32.7503, lng: 129.8779 },
  '熊本': { lat: 32.8031, lng: 130.7079 },
  '大分': { lat: 33.2382, lng: 131.6126 },
  '宮崎': { lat: 31.9111, lng: 131.4239 },
  '鹿児島': { lat: 31.5602, lng: 130.5581 },
  '沖縄': { lat: 26.2124, lng: 127.6809 },
};

export default function TripMap({ stops, prefecture, travelMode = 'WALKING' }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const directionsRendererRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!cachedApiKey) {
        const res = await invokeFunction('getMapsApiKey');
        cachedApiKey = res.data.apiKey;
      }
      await loadGoogleMaps(cachedApiKey);
      if (cancelled || !mapRef.current) return;
      renderMap();
    }

    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (window.google && mapRef.current) {
      renderMap();
    }
  }, [stops]);

  function drawMarkersOnly(map, validStops, prefCoord) {
    const bounds = new window.google.maps.LatLngBounds();
    const path = [];

    validStops.forEach((stop, i) => {
      const position = { lat: stop.lat, lng: stop.lng };
      bounds.extend(position);
      path.push(position);
      const marker = new window.google.maps.Marker({
        position,
        map,
        label: { text: String(i + 1), color: 'white', fontWeight: 'bold', fontSize: '12px' },
        title: stop.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker);
    });

    // フォールバック直線ポリライン
    polylineRef.current = new window.google.maps.Polyline({
      path,
      map,
      strokeColor: '#2563eb',
      strokeOpacity: 0.7,
      strokeWeight: 3,
    });

    map.fitBounds(bounds);
  }

  async function renderMap() {
    if (!window.google || !mapRef.current) return;

    const validStops = (stops || [])
      .filter(s => s.lat && s.lng)
      .sort((a, b) => a.order_index - b.order_index);

    // 既存マーカー・ポリライン・DirectionsRendererをクリア
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (directionsRendererRef.current) { directionsRendererRef.current.setMap(null); directionsRendererRef.current = null; }

    const prefCoord = prefecture
      ? Object.entries(PREFECTURE_COORDS).find(([k]) => prefecture.includes(k))?.[1]
      : null;
    const defaultCenter = prefCoord || { lat: 35.6812, lng: 139.7671 };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: prefCoord ? 10 : 8,
        disableDefaultUI: true,
        zoomControl: true,
      });
    }

    const map = mapInstanceRef.current;

    if (validStops.length === 0) {
      if (prefCoord) {
        map.setCenter(prefCoord);
        map.setZoom(10);
        const marker = new window.google.maps.Marker({
          position: prefCoord,
          map,
          title: prefecture,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        markersRef.current.push(marker);
      }
      return;
    }

    // 1スポットのみの場合はマーカーだけ
    if (validStops.length === 1) {
      drawMarkersOnly(map, validStops, prefCoord);
      return;
    }

    // マーカーを先に描画
    validStops.forEach((stop, i) => {
      const marker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map,
        label: { text: String(i + 1), color: 'white', fontWeight: 'bold', fontSize: '12px' },
        title: stop.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker);
    });

    // Directions APIでルート取得
    try {
      const origin = { lat: validStops[0].lat, lng: validStops[0].lng };
      const destination = { lat: validStops[validStops.length - 1].lat, lng: validStops[validStops.length - 1].lng };
      const waypoints = validStops.slice(1, -1).map(s => ({
        location: { lat: s.lat, lng: s.lng },
        stopover: true,
      }));

      const directionsService = new window.google.maps.DirectionsService();
      const result = await directionsService.route({
        origin,
        destination,
        waypoints,
        travelMode: window.google.maps.TravelMode[travelMode],
        optimizeWaypoints: false,
      });

      // DirectionsRendererでルート表示（マーカーは自前のため非表示）
      const renderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeOpacity: 0.8,
          strokeWeight: 4,
        },
      });
      renderer.setMap(map);
      renderer.setDirections(result);
      directionsRendererRef.current = renderer;

      // fitBoundsをルート全体に合わせる
      const bounds = new window.google.maps.LatLngBounds();
      result.routes[0].legs.forEach(leg => {
        leg.steps.forEach(step => {
          step.path.forEach(p => bounds.extend(p));
        });
      });
      map.fitBounds(bounds);

    } catch {
      // フォールバック: 直線ポリライン
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
      const bounds = new window.google.maps.LatLngBounds();
      const path = validStops.map(s => {
        const pos = { lat: s.lat, lng: s.lng };
        bounds.extend(pos);
        return pos;
      });
      polylineRef.current = new window.google.maps.Polyline({
        path,
        map,
        strokeColor: '#2563eb',
        strokeOpacity: 0.7,
        strokeWeight: 3,
      });
      map.fitBounds(bounds);
    }
  }

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100%' }}
      className="bg-gray-200"
    />
  );
}