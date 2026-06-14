'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const statusColorMap = {
  'payment received': '#2196F3',
  'pending': '#FF9800',
  'processing': '#FF9800',
  'cancelled': '#757575',
  'default': '#9C27B0',
};

function getStatusColor(status) {
  if (!status) return statusColorMap.default;
  const normalized = status.toLowerCase();
  for (const [key, color] of Object.entries(statusColorMap)) {
    if (normalized.includes(key)) return color;
  }
  return statusColorMap.default;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date < new Date();
}

export default function MapComponent({ orders, hiddenOrders }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const geocachRef = useRef({});

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

  const geocodePostalCode = async (postalCode) => {
    if (geocachRef.current[postalCode]) {
      return geocachRef.current[postalCode];
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&postalcode=${postalCode}&countrycode=pl&limit=1`
      );
      const data = await response.json();
      if (data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geocachRef.current[postalCode] = coords;
        return coords;
      }
    } catch (e) {
      console.log('Geocoding error');
    }
    return null;
  };

  useEffect(() => {
    const updateMap = async () => {
      if (!mapInstanceRef.current) return;

      Object.values(markersRef.current).forEach((m) => {
        mapInstanceRef.current.removeLayer(m.marker);
      });
      markersRef.current = {};

      for (const [id, order] of Object.entries(orders)) {
        if (hiddenOrders.has(id)) continue;

        const coords = await geocodePostalCode(order.zip);
        if (!coords) continue;

        const color = isOverdue(order.date) ? '#F44336' : getStatusColor(order.status);
        const customIcon = L.divIcon({
          html: `<div style="background: ${color}; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; text-align: center; padding: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid white; overflow: hidden;">${id}</div>`,
          iconSize: [40, 40],
          className: 'custom-icon',
        });

        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(mapInstanceRef.current);
        const popupContent = `
          <div style="font-size: 12px; width: 200px;">
            <strong style="font-size: 13px; display: block; margin-bottom: 8px;">${id}</strong>
            <div style="margin-bottom: 4px;"><strong>Status:</strong> ${order.status || 'Brak'}</div>
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
  }, [orders, hiddenOrders]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}