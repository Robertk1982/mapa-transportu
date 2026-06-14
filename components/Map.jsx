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
};

function getStatusColor(status) {
  if (!status) return '#9C27B0';
  if (statusColorMap[status]) return statusColorMap[status];
  for (const [key, color] of Object.entries(statusColorMap)) {
    if (status.includes(key)) return color;
  }
  return '#9C27B0';
}

export default function MapComponent({ 
  orders = {}, 
  hiddenOrders = new Set(),
  selectedTransports = [],
  selectedStatuses = []
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const geocacheRef = useRef({});
  const [ready, setReady] = useState(false);

  // Inicjalizuj mapę RAZ
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = L.map(mapRef.current).setView([52, 19], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(mapInstanceRef.current);

    // Załaduj geocache
    get(ref(database, 'geocache')).then((snapshot) => {
      if (snapshot.exists()) {
        geocacheRef.current = snapshot.val();
      }
      setReady(true);
    }).catch(() => {
      setReady(true);
    });
  }, []);

  // Aktualizuj markery
  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;

    // Usuń stare markery
    markersRef.current.forEach(m => mapInstanceRef.current.removeLayer(m));
    markersRef.current = [];

    for (const [id, order] of Object.entries(orders)) {
      // Ukryte
      if (hiddenOrders.has(id)) continue;

      // Filtr transportu
      if (selectedTransports.length > 0) {
        const transport = order.transport || '';
        const isDedykowana = transport.includes('dedykowana') || transport.includes('Dedykowana');
        const isPaletowa = transport.includes('paletowa') || transport.includes('Paletowa');
        
        const matchesTransport = selectedTransports.some(t => {
          if (t.includes('dedykowana') || t.includes('Dedykowana')) return isDedykowana;
          if (t.includes('paletowa') || t.includes('Paletowa')) return isPaletowa;
          return false;
        });
        
        if (!matchesTransport) continue;
      }

      // Filtr statusu
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(order.status)) continue;
      }

      // Współrzędne z geocache
      const zip = order.zip;
      if (!zip) continue;

      const safeZip = zip.replace(/\./g, '_');
      const coords = geocacheRef.current[safeZip] || geocacheRef.current[zip];
      if (!coords) continue;

      // Marker
      const color = getStatusColor(order.status);
      const icon = L.divIcon({
        html: `<div style="background:${color};color:#fff;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid #fff;">${id}</div>`,
        iconSize: [40, 40],
        className: '',
      });

      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(mapInstanceRef.current);

      const transportLabel = (order.transport || '').includes('dedykowana') || (order.transport || '').includes('Dedykowana')
        ? '📦 Dedykowana' 
        : '📫 Paletowa';

      marker.bindPopup(`
        <div style="font-size:12px;min-width:180px;">
          <strong style="font-size:14px;">${id}</strong><br/><br/>
          <b>Status:</b> ${order.status || 'Brak'}<br/>
          <b>Transport:</b> ${transportLabel}<br/>
          <b>Data:</b> ${order.date || 'Brak'}<br/>
          <b>Wartość:</b> ${parseFloat(String(order.value).replace(',','.')).toFixed(2)} PLN<br/>
          <b>Kod:</b> ${zip}
        </div>
      `);

      markersRef.current.push(marker);
    }
  }, [orders, hiddenOrders, selectedTransports, selectedStatuses, ready]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
