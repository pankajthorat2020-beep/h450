/**
 * RoutePreviewScreen
 * Displays destination search, start location selector, interactive route preview on map,
 * distance, estimated travel time, alternative routes, and Start Navigation trigger.
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Navigation, 
  RotateCw, 
  Clock, 
  Milestone, 
  Compass, 
  AlertCircle,
  X
} from 'lucide-react';
import { Destination, Location, Route } from '../types/navigation';
import { routeManager } from '../navigation/RouteManager';
import { MapView } from './MapView';

interface RoutePreviewScreenProps {
  currentLocation: Location | null;
  initialDestination?: Destination | null;
  onStartNavigation: (origin: Destination, destination: Destination, route: Route) => void;
  onCancel: () => void;
}

export const RoutePreviewScreen: React.FC<RoutePreviewScreenProps> = ({
  currentLocation,
  initialDestination = null,
  onStartNavigation,
  onCancel,
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState(initialDestination?.name || '');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selected Origin & Destination
  const [origin, setOrigin] = useState<Destination>({
    id: 'origin-current-gps',
    name: 'Current Location',
    address: currentLocation ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}` : 'My GPS Location',
    latitude: currentLocation?.latitude || 18.5204,
    longitude: currentLocation?.longitude || 73.8567,
  });

  const [destination, setDestination] = useState<Destination | null>(initialDestination);

  // Routes state
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Perform place search with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await routeManager.searchPlaces(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // When destination is chosen, calculate routes automatically
  useEffect(() => {
    if (!destination) return;

    const fetchRoute = async () => {
      setIsLoadingRoute(true);
      setRouteError(null);

      try {
        const calculatedRoutes = await routeManager.calculateRoute(
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude],
          { alternatives: true }
        );

        setRoutes(calculatedRoutes);
        setSelectedRouteIndex(0);
      } catch (err: any) {
        setRouteError('Could not calculate motorcycle route. Using offline fallback.');
        const fallback = routeManager.generateOfflineRoute(
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude]
        );
        setRoutes([fallback]);
        setSelectedRouteIndex(0);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [origin, destination]);

  const activeRoute = routes[selectedRouteIndex] || null;

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-white select-none">
      {/* Top Bar */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between z-20 shadow-md">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition px-2 py-1 -ml-2 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Cancel</span>
        </button>
        <span className="text-sm font-black tracking-wider uppercase text-zinc-300">
          Route Preview
        </span>
        <div className="w-12" /> {/* Balancing spacer */}
      </div>

      {/* Origin / Destination Search Input Box */}
      <div className="p-4 bg-zinc-900/95 border-b border-zinc-800 space-y-2 z-20">
        {/* From Start Location */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
          <div className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-emerald-500/30" />
          <span className="text-zinc-500 font-semibold w-10">From:</span>
          <span className="text-zinc-200 font-medium truncate flex-1">{origin.name}</span>
        </div>

        {/* Destination Search Box */}
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-sm focus-within:border-cyan-400 transition">
            <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-red-600/30" />
            <span className="text-zinc-500 font-semibold text-xs w-10">To:</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination, city, or pass..."
              className="bg-transparent flex-1 text-sm text-white placeholder-zinc-500 focus:outline-none"
              autoFocus={!initialDestination}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDestination(null);
                  setRoutes([]);
                }}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-750 shadow-2xl z-50 divide-y divide-zinc-800">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    setDestination(result);
                    setSearchQuery(result.name);
                    setSearchResults([]);
                  }}
                  className="w-full text-left p-3 hover:bg-zinc-800 flex items-center gap-3 transition"
                >
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-100 truncate">{result.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{result.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map View */}
      <div className="flex-1 relative">
        <MapView
          currentLocation={currentLocation}
          origin={origin}
          destination={destination}
          route={activeRoute}
          onSelectCoordinate={(coord) => {
            // Allow user to tap map to set destination
            setDestination({
              id: `dest-${Date.now()}`,
              name: `Pin (${coord[0].toFixed(3)}, ${coord[1].toFixed(3)})`,
              address: `Coordinate: ${coord[0].toFixed(5)}, ${coord[1].toFixed(5)}`,
              latitude: coord[0],
              longitude: coord[1],
            });
            setSearchQuery(`Selected Map Pin`);
          }}
        />

        {/* Loading overlay for route calculation */}
        {isLoadingRoute && (
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
              <RotateCw className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-sm font-semibold text-zinc-200">
                Calculating Himalayan motorcycle route...
              </span>
            </div>
          </div>
        )}

        {/* Map selection helper hint */}
        {!destination && !isLoadingRoute && (
          <div className="absolute top-4 left-4 right-4 bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 p-3 rounded-xl text-center shadow-lg z-10">
            <p className="text-xs text-zinc-300 font-medium">
              💡 Search a destination above or <span className="text-cyan-400 font-bold">tap anywhere on the map</span> to set destination pin.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Route Summary & Start Navigation Card */}
      {destination && activeRoute && (
        <div className="p-5 bg-zinc-900 border-t border-zinc-800 z-20 space-y-4 shadow-2xl">
          {/* Alternative Routes Selector (if multiple) */}
          {routes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {routes.map((r, idx) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRouteIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    selectedRouteIndex === idx
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Route {idx + 1} ({formatDuration(r.totalDurationSeconds)})
                </button>
              ))}
            </div>
          )}

          {/* Metric Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                <Milestone className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-zinc-100">
                  {formatDistance(activeRoute.totalDistanceMeters)}
                </div>
                <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{formatDuration(activeRoute.totalDurationSeconds)} ride</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Destination
              </span>
              <p className="text-sm font-bold text-zinc-200 max-w-[150px] truncate">
                {destination.name}
              </p>
            </div>
          </div>

          {/* Start Navigation Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onStartNavigation(origin, destination, activeRoute)}
              className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-zinc-950 font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-950/50 active:scale-[0.98] transition-all"
            >
              <Navigation className="w-5 h-5 fill-current" />
              <span>START NAVIGATION</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
