import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Navigation, Compass, MapPin, Maximize2 } from 'lucide-react';
import { TripStop, TripEvent, Vehicle } from '../types';

interface Props {
  baseLocation?: { name: string; latitude?: number; longitude?: number };
  stops?: TripStop[];
  events?: TripEvent[];
  driverLocation?: { latitude: number; longitude: number; heading?: number; accuracy?: number };
  fleetVehicles?: Vehicle[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
  focusedLocation?: { latitude: number; longitude: number } | null;
  height?: string;
  theme?: 'dark' | 'light';
  showGoogleMapsButton?: boolean;
  showToolbar?: boolean;
}

type MapLayerType = 'dark' | 'streets' | 'satellite';

export const LeafletMap: React.FC<Props> = ({
  baseLocation,
  stops = [],
  events = [],
  driverLocation,
  fleetVehicles = [],
  onSelectVehicle,
  focusedLocation,
  height = '420px',
  theme = 'dark',
  showGoogleMapsButton = true,
  showToolbar = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Dedicated persistent layer groups to prevent DOM teardown & blinking
  const staticLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const vehicleLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const driverCircleRef = useRef<L.Circle | null>(null);
  const hasFittedInitialBoundsRef = useRef(false);

  const [mapLayer, setMapLayer] = useState<MapLayerType>(theme === 'light' ? 'streets' : 'dark');

  // Build Google Maps Multi-Stop Direction URL
  const getGoogleMapsUrl = (): string => {
    const originLat = baseLocation?.latitude || 28.5355;
    const originLng = baseLocation?.longitude || 77.268;

    const validStops = stops.filter((s) => s.latitude && s.longitude);
    if (validStops.length === 0) {
      return `https://www.google.com/maps/search/?api=1&query=${originLat},${originLng}`;
    }

    const lastStop = validStops[validStops.length - 1];
    const waypoints = validStops
      .slice(0, -1)
      .map((s) => `${s.latitude},${s.longitude}`)
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${lastStop.latitude},${lastStop.longitude}`;
    if (waypoints) {
      url += `&waypoints=${encodeURIComponent(waypoints)}`;
    }
    return url;
  };

  const getTileUrl = (type: MapLayerType): { url: string; options: L.TileLayerOptions } => {
    switch (type) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          options: {
            attribution: 'Tiles &copy; Esri &mdash; Telematics Satellite Imagery',
            maxZoom: 19
          }
        };
      case 'streets':
        return {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          options: {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }
        };
      case 'dark':
      default:
        return {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          options: {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &bull; Fleet Telematics',
            className: 'map-tiles-dark',
            maxZoom: 19
          }
        };
    }
  };

  // Sync layer with theme prop if changed
  useEffect(() => {
    setMapLayer(theme === 'light' ? 'streets' : 'dark');
  }, [theme]);

  // Recenter / Fit All helper
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: [number, number][] = [];
    if (baseLocation?.latitude && baseLocation?.longitude) {
      points.push([baseLocation.latitude, baseLocation.longitude]);
    }
    stops.forEach((s) => {
      if (s.latitude && s.longitude) points.push([s.latitude, s.longitude]);
    });
    fleetVehicles.forEach((v) => {
      if (v.latitude && v.longitude) points.push([v.latitude, v.longitude]);
    });

    if (points.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 15 });
      } catch {}
    }
  }, [baseLocation, stops, fleetVehicles]);

  // 1. INITIALIZE MAP ONCE (No destruction on data updates)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const defaultCenter: [number, number] = [
      baseLocation?.latitude || 28.5355,
      baseLocation?.longitude || 77.268
    ];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        scrollWheelZoom: true
      });

      const { url, options } = getTileUrl(mapLayer);
      const tiles = L.tileLayer(url, options).addTo(map);

      tileLayerRef.current = tiles;
      mapInstanceRef.current = map;

      // Create persistent layer groups
      staticLayerGroupRef.current = L.layerGroup().addTo(map);
      vehicleLayerGroupRef.current = L.layerGroup().addTo(map);

      // Single initial invalidateSize to ensure correct canvas geometry
      requestAnimationFrame(() => {
        try { map.invalidateSize(); } catch {}
      });
    } else if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const { url, options } = getTileUrl(mapLayer);
      const tiles = L.tileLayer(url, options).addTo(mapInstanceRef.current);
      tileLayerRef.current = tiles;
    }
  }, [mapLayer]);

  // 2. STATIC ROUTE, DEPOT HQ & STOPS (Only rebuilt when stops or base location actually change)
  const stopsHash = stops.map((s) => `${s.id}-${s.status}-${s.latitude}-${s.longitude}`).join('|');
  const baseHash = `${baseLocation?.latitude}-${baseLocation?.longitude}-${baseLocation?.name}`;

  useEffect(() => {
    const map = mapInstanceRef.current;
    const staticGroup = staticLayerGroupRef.current;
    if (!map || !staticGroup) return;

    // Clear only the static layer group
    staticGroup.clearLayers();

    const latLngs: L.LatLngExpression[] = [];

    // 1. Base / Depot Marker (Golden HQ Badge)
    if (baseLocation?.latitude && baseLocation?.longitude) {
      const baseIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `<div style="background:linear-gradient(135deg, #c5a059, #e6c887);color:#0d0e11;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;border:2px solid #ffffff;box-shadow:0 0 16px rgba(197,160,89,0.9);letter-spacing:0.5px;">HQ</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const basePos: [number, number] = [baseLocation.latitude, baseLocation.longitude];
      L.marker(basePos, { icon: baseIcon })
        .addTo(staticGroup)
        .bindPopup(`
          <div style="font-family:Inter,sans-serif;padding:4px;">
            <div style="font-size:11px;font-weight:700;color:#c5a059;text-transform:uppercase;letter-spacing:0.5px;">Dispatch Headquarters</div>
            <div style="font-size:14px;font-weight:700;color:#0f172a;margin:2px 0;">${baseLocation.name || 'Central Fleet Terminal'}</div>
            <div style="font-size:11px;color:#64748b;">GPS: ${baseLocation.latitude.toFixed(4)}, ${baseLocation.longitude.toFixed(4)}</div>
            <a href="https://www.google.com/maps/search/?api=1&query=${baseLocation.latitude},${baseLocation.longitude}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#2563eb;font-weight:600;margin-top:6px;text-decoration:none;">
              📍 Open Location in Google Maps &rarr;
            </a>
          </div>
        `);
      latLngs.push(basePos);
    }

    // 2. Destination Stop Markers with Sequence Numbers & Geofence Rings
    stops.forEach((stop) => {
      if (stop.latitude && stop.longitude) {
        const isCompleted = stop.status === 'COMPLETED';
        const isArrived = stop.status === 'ARRIVED' || stop.status === 'IN_PROGRESS';
        const bgGrad = isCompleted
          ? 'linear-gradient(135deg, #10b981, #059669)'
          : isArrived
          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
          : 'linear-gradient(135deg, #0284c7, #0369a1)';

        const stopIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `<div style="background:${bgGrad};color:#ffffff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;border:2px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.6);">${stop.stop_number}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const stopPos: [number, number] = [stop.latitude, stop.longitude];

        // Draw Geofence Radius Circle
        L.circle(stopPos, {
          radius: stop.geofence_radius_meters || 150,
          color: isCompleted ? '#10b981' : '#38bdf8',
          fillColor: isCompleted ? '#10b981' : '#38bdf8',
          fillOpacity: 0.12,
          weight: 1,
          dashArray: '3, 4'
        }).addTo(staticGroup);

        L.marker(stopPos, { icon: stopIcon })
          .addTo(staticGroup)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;padding:4px;min-width:180px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <span style="font-size:10px;font-weight:700;color:#c5a059;text-transform:uppercase;">Stop #${stop.stop_number}</span>
                <span style="font-size:10px;padding:2px 6px;border-radius:10px;background:${isCompleted ? '#d1fae5' : '#e0f2fe'};color:${isCompleted ? '#065f46' : '#0369a1'};font-weight:700;">${stop.status}</span>
              </div>
              <div style="font-size:13px;font-weight:700;color:#0f172a;margin:3px 0;">${stop.destination_name}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:4px;">${stop.address}</div>
              <div style="font-size:11px;color:#334155;">Planned: <b>${stop.planned_arrival_time}</b> ${stop.actual_arrival_time ? `&bull; Actual: <b>${new Date(stop.actual_arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>` : ''}</div>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#2563eb;font-weight:600;margin-top:6px;text-decoration:none;">
                🧭 Google Maps Directions &rarr;
              </a>
            </div>
          `);
        latLngs.push(stopPos);
      }
    });

    // 3. Planned Route Corridor Polyline (Connecting stops)
    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: '#38bdf8',
        weight: 3,
        opacity: 0.6,
        dashArray: '8, 8'
      }).addTo(staticGroup);
    }

    // 4. GPS Actual Breadcrumb Events & Active Vehicle
    const validEvents = events.filter(
      (e) => typeof e.latitude === 'number' && typeof e.longitude === 'number'
    );

    if (validEvents.length > 0) {
      const eventPoints: [number, number][] = validEvents.map((e) => [
        e.latitude!,
        e.longitude!
      ]);

      L.polyline(eventPoints, {
        color: '#c5a059',
        weight: 4,
        opacity: 0.9
      }).addTo(staticGroup);

      const latest = validEvents[validEvents.length - 1];
      const truckIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:rgba(56,189,248,0.4);animation:pulse 2s infinite;"></div>
            <div style="background:linear-gradient(135deg, #0284c7, #38bdf8);color:#ffffff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #ffffff;box-shadow:0 0 16px #38bdf8;z-index:2;">🚛</div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      L.marker([latest.latitude!, latest.longitude!], { icon: truckIcon })
        .addTo(staticGroup)
        .bindPopup(`
          <div style="font-family:Inter,sans-serif;padding:4px;">
            <div style="font-size:10px;font-weight:700;color:#0284c7;text-transform:uppercase;">Live Telematics Beacon</div>
            <div style="font-size:13px;font-weight:700;color:#0f172a;margin:2px 0;">Active Vehicle Position</div>
            <div style="font-size:11px;color:#334155;">Time: <b>${new Date(latest.timestamp).toLocaleTimeString()}</b></div>
            <div style="font-size:11px;color:#334155;">GPS Accuracy: <b>&plusmn;${Math.round(latest.gps_accuracy || 8)}m</b></div>
          </div>
        `);
    }

    // Auto-fit bounds ONLY ONCE on initial load to prevent window blinking
    if (!hasFittedInitialBoundsRef.current && latLngs.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 15 });
        hasFittedInitialBoundsRef.current = true;
      } catch {}
    }
  }, [stopsHash, baseHash, events.length]);

  // 3. SEAMLESS DYNAMIC FLEET VEHICLE UPDATES (In-place coordinate mutation with NO re-fits or layer teardowns)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const vehicleGroup = vehicleLayerGroupRef.current;
    if (!map || !vehicleGroup) return;

    const currentVehicles = fleetVehicles || [];
    const activeVehicleIds = new Set<string>();

    currentVehicles.forEach((vehicle) => {
      if (typeof vehicle.latitude !== 'number' || typeof vehicle.longitude !== 'number') return;
      activeVehicleIds.add(vehicle.id);

      const pos: [number, number] = [vehicle.latitude, vehicle.longitude];
      const isMoving = (vehicle.speed_kmh || 0) > 2;
      const statusColor = isMoving ? '#10b981' : vehicle.status === 'AVAILABLE' ? '#38bdf8' : '#eab308';
      const heading = vehicle.heading_deg || 0;

      const vehicleIcon = L.divIcon({
        className: 'custom-fleet-vehicle-marker',
        html: `
          <div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
            ${isMoving ? `<div style="position:absolute;width:100%;height:100%;border-radius:50%;background:${statusColor};opacity:0.25;animation:pulse 1.8s infinite;"></div>` : ''}
            <div style="position:relative;background:${isMoving ? '#0f172a' : '#1e293b'};border:2px solid ${statusColor};border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
              <span style="font-size:16px;">${vehicle.type === 'TRAILER' ? '🚛' : vehicle.type === 'HEAVY_TRUCK' ? '🚚' : '🚐'}</span>
              ${heading ? `
                <div style="position:absolute;top:-4px;left:50%;transform:translateX(-50%) rotate(${heading}deg);transform-origin:bottom center;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:7px solid ${statusColor};"></div>
              ` : ''}
            </div>
            ${isMoving ? `
              <div style="position:absolute;bottom:-6px;background:${statusColor};color:#ffffff;font-size:9px;font-weight:800;padding:1px 4px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.4);white-space:nowrap;">
                ${Math.round(vehicle.speed_kmh || 0)} km/h
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      const existingMarker = vehicleMarkersMapRef.current.get(vehicle.id);
      if (existingMarker) {
        // SMOOTH POSITION UPDATE: In-place transition without removing layers or flashing tiles
        existingMarker.setLatLng(pos);
        existingMarker.setIcon(vehicleIcon);
        existingMarker.setZIndexOffset(isMoving ? 500 : 200);
      } else {
        // Create new vehicle marker
        const marker = L.marker(pos, { icon: vehicleIcon, zIndexOffset: isMoving ? 500 : 200 })
          .addTo(vehicleGroup);

        marker.on('click', () => {
          if (onSelectVehicle) onSelectVehicle(vehicle);
        });

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;padding:6px;min-width:210px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
              <span style="font-size:12px;font-weight:800;color:#0f172a;">${vehicle.vehicle_number}</span>
              <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;background:${isMoving ? '#d1fae5' : '#f1f5f9'};color:${isMoving ? '#065f46' : '#475569'};">${isMoving ? '🟢 In Transit' : '🟡 ' + vehicle.status}</span>
            </div>
            <div style="font-size:11px;color:#64748b;">${vehicle.model} &bull; ${vehicle.type}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px;padding:4px 6px;background:#f8fafc;border-radius:6px;font-size:11px;color:#334155;">
              <span>⚡ <b>${Math.round(vehicle.speed_kmh || 0)} km/h</b></span>
              <span>🧭 <b>${Math.round(vehicle.heading_deg || 0)}&deg; Heading</b></span>
            </div>
            ${vehicle.current_location ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">📍 ${vehicle.current_location}</div>` : ''}
            <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;">
              <a href="https://www.google.com/maps/search/?api=1&query=${vehicle.latitude},${vehicle.longitude}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#2563eb;font-weight:600;text-decoration:none;">
                Google Maps ↗
              </a>
              <span style="font-size:10px;color:#94a3b8;">${vehicle.capacity_tons} Tons Capacity</span>
            </div>
          </div>
        `);

        vehicleMarkersMapRef.current.set(vehicle.id, marker);
      }
    });

    // Prune vehicles no longer active
    vehicleMarkersMapRef.current.forEach((marker, id) => {
      if (!activeVehicleIds.has(id)) {
        vehicleGroup.removeLayer(marker);
        vehicleMarkersMapRef.current.delete(id);
      }
    });
  }, [fleetVehicles, onSelectVehicle]);

  // 4. DRIVER LOCATION BEACON
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !driverLocation?.latitude || !driverLocation?.longitude) return;

    const driverPos: [number, number] = [driverLocation.latitude, driverLocation.longitude];

    if (!driverMarkerRef.current) {
      const driverIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:rgba(37,211,102,0.35);animation:pulse 1.8s infinite;"></div>
            <div style="background:linear-gradient(135deg, #00a884, #25D366);color:#ffffff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2.5px solid #ffffff;box-shadow:0 0 16px rgba(37,211,102,0.8);z-index:2;">🚚</div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      driverMarkerRef.current = L.marker(driverPos, { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);

      if (driverLocation.accuracy) {
        driverCircleRef.current = L.circle(driverPos, {
          radius: Math.min(driverLocation.accuracy, 200),
          color: '#25D366',
          fillColor: '#25D366',
          fillOpacity: 0.12,
          weight: 1,
          dashArray: '2, 3'
        }).addTo(map);
      }
    } else {
      driverMarkerRef.current.setLatLng(driverPos);
      if (driverCircleRef.current) {
        driverCircleRef.current.setLatLng(driverPos);
      }
    }
  }, [driverLocation?.latitude, driverLocation?.longitude, driverLocation?.accuracy]);

  // Smooth pan/fly when a specific location is focused
  useEffect(() => {
    if (mapInstanceRef.current && focusedLocation?.latitude && focusedLocation?.longitude) {
      mapInstanceRef.current.flyTo([focusedLocation.latitude, focusedLocation.longitude], 16, {
        animate: true,
        duration: 1.2
      });
    }
  }, [focusedLocation]);

  // Clean teardown on unmount
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.invalidateSize();
          } catch {}
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: height || '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Map Control Toolbar */}
      {showToolbar && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '10px'
          }}
        >
          {/* Layer Switcher & Recenter Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className={`btn ${mapLayer === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
                onClick={() => setMapLayer('dark')}
              >
                🌙 Telematics Dark
              </button>
              <button
                type="button"
                className={`btn ${mapLayer === 'streets' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
                onClick={() => setMapLayer('streets')}
              >
                🗺️ Streets (HD)
              </button>
              <button
                type="button"
                className={`btn ${mapLayer === 'satellite' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
                onClick={() => setMapLayer('satellite')}
              >
                🛰️ Satellite (Esri)
              </button>
            </div>

            {/* Recenter Button */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRecenter}
              style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Recenter and auto-fit all vehicles and stops"
            >
              <Compass size={13} />
              <span>Recenter Fleet</span>
            </button>
          </div>

          {/* Google Maps External Routing Link */}
          {showGoogleMapsButton && (
            <a
              href={getGoogleMapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '0.78rem',
                color: 'var(--accent-gold)',
                borderColor: 'rgba(197, 160, 89, 0.4)',
                textDecoration: 'none'
              }}
              title="Open complete multi-stop turn-by-turn routing in Google Maps"
            >
              <Navigation size={13} />
              <span>Open in Google Maps Directions</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: showToolbar ? 'calc(100% - 44px)' : '100%',
          flex: 1,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          zIndex: 1,
          minHeight: '350px'
        }}
      />
    </div>
  );
};
