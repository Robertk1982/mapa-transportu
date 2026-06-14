'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

const statusColorMap = {
  '! !Dostawa dedykowana coraz bliżej. Finiszujemy z produkcją.': '#FFC107',
  '! !Dostawa paletowa coraz bliżej. Finiszujemy z produkcją.': '#FFC107',
  '! Dostawa dedykowana o krok. Produkcja zakończona sukcesem.': '#4CAF50',
  '! Dostawa paletowa - Odpowiedz na wiadomość': '#2196F3',
  '! Płatność została poprawnie zaksięgowana': '#4CAF50',
  '! Twoje zamówienie zostało przekazane do realizacji': '#FF9800',
  'AA_Corpus (realizacja)': '#FF9800',
  'AA_Wydane na produkcje (realizacja)': '#FFC107',
  'Payment received (Tpay)': '#4CAF50',
  'Płatność przyjęta': '#4CAF50',
  'Płatność zaakceptowana': '#4CAF50',
  'default': '#9C27B0',
};

function getStatusColor(status) {
  if (!status) return statusColorMap.default;
  
  if (statusColorMap[status]) {
    return statusColorMap[status];
  }
  
  for (const [key, color] of Object.entries(statusColorMap)) {
    if (key !== 'default' && status.includes(key)) {
      return color;
    }
  }
  
  return statusColorMap.default;
}

export default function MapComponent({ 
  orders, 
  hiddenOrders,
  selectedTransports = [],
  selectedStatuses = []
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const geocacheRef = useRef({});
  const [loading, setLoading] = useState(true);

  // Załaduj geocache z Firebase
  useEffect(() => {
    const loadGeocache = async () => {
      try {
        const cacheSnapshot = await get(ref(database, 'geocache'));
        if (cacheSnapshot.exists()) {
          geocacheRef.current = cacheSnapshot.val();
        }
      } catch (e) {
        console.log('Failed to load geocache');
      } finally {
        setLoading(false);
      }
    };

    loadGeocache();
  }, []);

  // Inicjalizuj mapę
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([52, 19], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap',
      }).addTo(mapInstanceRef.current);
    }
  }, []);

  // Aktualizuj mapę gdy się załaduje geocache
  useEffect(() => {
    if (loading) return;

    const updateMap = async () => {
      if (!mapInstanceRef.current) return;

      // Usuń stare markery
      Object.values(markersRef.current).forEach((m) => {
        mapInstanceRef.current.removeLayer(m.marker);
      });
      markersRef.current = {};

      // Przetwórz zamówienia
      for (const [id, order] of Object.entries(orders || {})) {
        if (hiddenOrders.has(id)) continue;

        // Filtry transportu
        if (selectedTransports.length > 0) {
          const matchesTransport = selectedTransports.some(t => 
            (t === 'Dostawa dedykowana Flexmeble' && order.transport?.includes('Dostawa dedykowana')) ||
            (t === 'Dostawa kurierska paletowa' && order.transport?.includes('paletowa'))
          );
          if (!matchesTransport) continue;
        }

        // Filtry statusu
        if (selectedStatuses.length > 0) {
          if (!selectedStatuses.includes(order.status)) continue;
        }

        // Pobierz współrzędne z cache'u
        const coords = geocacheRef.current[order.zip];
        if (!coords) continue;

        // Utwórz marker
        const color = getStatusColor(order.status);
        const customIcon = L.divIcon({
          html: `<div style="background: ${color}; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; text-align: center; padding: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid white; overflow: hidden;">${id}</div>`,
          iconSize: [40, 40],
          className: 'custom-icon',
        });

        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(mapInstanceRef.current);

        const transportDisplay = order.transport?.includes('Dostawa dedykowana') 
          ? '📦 Dedykowana' 
          : '📫 Paletowa';

        const popupContent = `
          <div style="font-size: 12px; width: 200px;">
            <strong style="font-size: 13px; display: block; margin-bottom: 8px;">${id}</strong>
            <div style="margin-bottom: 4px;"><strong>Status:</strong> ${order.status || 'Brak'}</div>
            <div style="margin-bottom: 4px;"><strong>Transport:</strong> ${transportDisplay}</div>
            <div style="margin-bottom: 4px;"><strong>Data:</strong> ${order.date || 'Brak daty'}</div>
            <div style="margin-bottom: 4px;"><strong>Wartość:</strong> ${parseFloat(String(order.value).replace(',', '.')).toFixed(2)} PLN</div>
            <div><strong>Kod:</strong> ${order.zip}</div>
          </div>
        `;
        marker.bindPopup(popupContent);

        markersRef.current[id] = { marker, coords };
      }
    };

    updateMap();
  }, [orders, hiddenOrders, selectedTransports, selectedStatuses, loading]);

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#999' }}>⏳ Ładowanie mapy...</div>
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
