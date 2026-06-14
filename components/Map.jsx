'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { STATUS_COLORS } from './FilterPanel';

function getStatusColor(status) {
  if (!status) return '#9C27B0';
  for (const [key, color] of Object.entries(STATUS_COLORS)) {
    if (status.includes(key) || key.includes(status)) {
      return color;
    }
  }
  return '#9C27B0';
}

export default function MapComponent({ 
  orders, 
  hiddenOrders, 
  selectedTransports,
  selectedStatuses 
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const geocachRef = useRef({});
  const [hoveredId, setHoveredId] = useState(null);

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

      for (const [id, order] of Object.entries(orders || {})) {
        if (hiddenOrders.has(id)) continue;

        // Filtry
        if (selectedTransports.length > 0) {
          const matchesTransport = selectedTransports.some(t => 
            (t === 'Dostawa dedykowana Flexmeble' && order.transport?.includes('Dostawa dedykowana')) ||
            (t === 'Dostawa kurierska paletowa' && order.transport?.includes('paletowa'))
          );
          if (!matchesTransport) continue;
        }

        if (selectedStatuses.length > 0 && !selectedStatuses.includes(order.status)) {
          continue;
        }

        const coords = await geocodePostalCode(order.zip);
        if (!coords) continue;

        const color = getStatusColor(order.status);
        const isHovered = hoveredId === id;

        const customIcon = L.divIcon({
          html: `<div style="
            background: ${color}; 
            color: white; 
            width: ${isHovered ? '50px' : '40px'}; 
            height: ${isHovered ? '50px' : '40px'}; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: ${isHovered ? '12px' : '11px'}; 
            font-weight: bold; 
            text-align: center; 
            padding: 2px; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.25), ${isHovered ? `0 0 0 3px ${color}40` : ''}; 
            border: 2px solid white; 
            overflow: hidden;
            transition: all 0.2s;
            cursor: pointer;
          ">${id}</div>`,
          iconSize: [isHovered ? 50 : 40, isHovered ? 50 : 40],
          className: 'custom-icon',
        });

        const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(mapInstanceRef.current);

        const transportDisplay = order.transport?.includes('Dostawa dedykowana') 
          ? '📦 Dedykowana' 
          : '📫 Paletowa';

        const popupContent = `
          <div style="font-size: 12px; min-width: 200px;">
            <strong style="font-size: 13px; display: block; margin-bottom: 8px;">${id}</strong>
            <div style="margin-bottom: 4px;"><strong>Status:</strong> ${order.status || 'Brak'}</div>
            <div style="margin-bottom: 4px;"><strong>Transport:</strong> ${transportDisplay}</div>
            <div style="margin-bottom: 4px;"><strong>Data:</strong> ${order.date || 'Brak daty'}</div>
            <div style="margin-bottom: 4px;"><strong>Wartość:</strong> ${parseFloat(String(order.value).replace(',', '.')).toFixed(2)} PLN</div>
            <div><strong>Kod:</strong> ${order.zip}</div>
          </div>
        `;
        marker.bindPopup(popupContent);

        // Hover effect
        marker.on('mouseover', () => setHoveredId(id));
        marker.on('mouseout', () => setHoveredId(null));

        markersRef.current[id] = { marker, coords };
      }
    };

    updateMap();
  }, [orders, hiddenOrders, selectedTransports, selectedStatuses, hoveredId]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
