/**
 * MapView
 * Leaflet-powered motorcycle map component supporting route polylines,
 * heading-oriented rider marker, destination selection, and camera following.
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Destination, Location, Route } from '../types/navigation';

interface MapViewProps {
  currentLocation: Location | null;
  origin?: Destination | null;
  destination?: Destination | null;
  route?: Route | null;
  interactive?: boolean;
  followRider?: boolean;
  onSelectCoordinate?: (coord: [number, number]) => void;
  className?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  currentLocation,
  origin,
  destination,
  route,
  interactive = true,
  followRider = false,
  onSelectCoordinate,
  className = 'w-full h-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polylineCasingRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = currentLocation?.latitude || 18.5204;
    const initialLng = currentLocation?.longitude || 73.8567;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark motorcycle-optimized CartoDB Dark Matter tiles (high contrast for night/outdoor riding)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    if (interactive && onSelectCoordinate) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onSelectCoordinate([e.latlng.lat, e.latlng.lng]);
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Rider Location Marker & Camera
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentLocation) return;

    const latLng: [number, number] = [currentLocation.latitude, currentLocation.longitude];
    const heading = currentLocation.heading ?? 0;

    // Custom motorcycle arrow icon with heading rotation
    const iconHtml = `
      <div style="transform: rotate(${heading}deg); transition: transform 0.2s ease-out;" class="relative flex items-center justify-center w-10 h-10">
        <div class="absolute w-8 h-8 rounded-full bg-cyan-500/20 animate-ping"></div>
        <div class="w-8 h-8 rounded-full bg-cyan-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
          <svg class="w-4 h-4 fill-current transform -rotate-45" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
        </div>
      </div>
    `;

    const riderIcon = L.divIcon({
      html: iconHtml,
      className: 'rider-marker-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (!riderMarkerRef.current) {
      riderMarkerRef.current = L.marker(latLng, { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      riderMarkerRef.current.setLatLng(latLng);
      riderMarkerRef.current.setIcon(riderIcon);
    }

    if (followRider) {
      map.panTo(latLng, { animate: true, duration: 0.6 });
    }
  }, [currentLocation, followRider]);

  // Update Destination Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (destination) {
      const destLatLng: [number, number] = [destination.latitude, destination.longitude];
      const destIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <div class="w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
              ★
            </div>
          </div>
        `,
        className: 'dest-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker(destLatLng, { icon: destIcon }).addTo(map);
      } else {
        destMarkerRef.current.setLatLng(destLatLng);
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
  }, [destination]);

  // Update Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (route && route.polyline && route.polyline.length > 0) {
      // Remove previous lines
      if (polylineRef.current) polylineRef.current.remove();
      if (polylineCasingRef.current) polylineCasingRef.current.remove();

      // Underlayer glowing casing
      polylineCasingRef.current = L.polyline(route.polyline, {
        color: '#0891b2',
        weight: 9,
        opacity: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Main Route line
      polylineRef.current = L.polyline(route.polyline, {
        color: '#06b6d4',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Fit bounds if not actively following rider
      if (!followRider) {
        const bounds = L.latLngBounds(route.polyline);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else {
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      if (polylineCasingRef.current) {
        polylineCasingRef.current.remove();
        polylineCasingRef.current = null;
      }
    }
  }, [route, followRider]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
