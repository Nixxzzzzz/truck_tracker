import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TripStop, TripEvent } from '../types';

interface Props {
  baseLocation?: { name: string; latitude?: number; longitude?: number };
  stops?: TripStop[];
  events?: TripEvent[];
  height?: string;
}

export const LeafletMap: React.FC<Props> = ({
  baseLocation,
  stops = [],
  events = [],
  height = '380px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default center (Bhopal company base if no coords)
    const defaultCenter: [number, number] = [
      baseLocation?.latitude || 23.2599,
      baseLocation?.longitude || 77.4126
    ];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        scrollWheelZoom: false
      });

      // CartoDB Dark Matter tiles for luxury dark aesthetic
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 19
        }
      ).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous layers (except tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const latLngs: L.LatLngExpression[] = [];

    // 1. Base / Depot Marker
    if (baseLocation?.latitude && baseLocation?.longitude) {
      const baseIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `<div style="background:#c5a059;color:#0e1013;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 0 10px rgba(197,160,89,0.7);">HQ</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const basePos: [number, number] = [baseLocation.latitude, baseLocation.longitude];
      L.marker(basePos, { icon: baseIcon })
        .addTo(map)
        .bindPopup(`<b>Company Base</b><br>${baseLocation.name || 'Central Logistics Hub'}`);
      latLngs.push(basePos);
    }

    // 2. Destination Stop Markers
    stops.forEach((stop) => {
      if (stop.latitude && stop.longitude) {
        const isCompleted = stop.status === 'COMPLETED';
        const isArrived = stop.status === 'ARRIVED' || stop.status === 'IN_PROGRESS';
        const color = isCompleted ? '#10b981' : isArrived ? '#c5a059' : '#38bdf8';

        const stopIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `<div style="background:${color};color:#0e1013;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);">${stop.stop_number}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const stopPos: [number, number] = [stop.latitude, stop.longitude];
        L.marker(stopPos, { icon: stopIcon })
          .addTo(map)
          .bindPopup(
            `<b>Stop ${stop.stop_number}: ${stop.destination_name}</b><br>${stop.address}<br>Status: <i>${stop.status}</i>`
          );
        latLngs.push(stopPos);
      }
    });

    // 3. GPS Actual Breadcrumb Events
    const validEvents = events.filter(
      (e) => typeof e.latitude === 'number' && typeof e.longitude === 'number'
    );

    if (validEvents.length > 0) {
      const eventPoints: [number, number][] = validEvents.map((e) => [
        e.latitude!,
        e.longitude!
      ]);

      // Route polyline in champagne gold
      L.polyline(eventPoints, {
        color: '#c5a059',
        weight: 3,
        opacity: 0.8,
        dashArray: '6, 6'
      }).addTo(map);

      // Latest known vehicle location
      const latest = validEvents[validEvents.length - 1];
      const truckIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `<div style="background:#38bdf8;color:#0e1013;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #fff;box-shadow:0 0 12px #38bdf8;">🚛</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([latest.latitude!, latest.longitude!], { icon: truckIcon })
        .addTo(map)
        .bindPopup(
          `<b>Latest Vehicle GPS Position</b><br>Time: ${new Date(latest.timestamp).toLocaleTimeString()}<br>Accuracy: ±${Math.round(latest.gps_accuracy || 10)}m`
        );
    } else if (latLngs.length > 1) {
      // Draw connecting line between planned stops
      L.polyline(latLngs, {
        color: '#6b7382',
        weight: 2,
        opacity: 0.5,
        dashArray: '4, 4'
      }).addTo(map);
    }

    // Fit bounds if markers exist
    if (latLngs.length > 0) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [30, 30], maxZoom: 15 });
    }
  }, [baseLocation, stops, events]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        zIndex: 1
      }}
    />
  );
};
