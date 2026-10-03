/**
 * Royal Enfield Himalayan 450 Navigation Application
 * 
 * Minimalist, high-contrast motorcycle navigation app specifically built for the
 * Himalayan 450 "Tripper Dash" TFT instrument cluster.
 * 
 * Features:
 * - Simple flow: Select Start -> Select Destination -> Route Preview -> Start Navigation -> Himalayan Dash Wi-Fi Stream
 * - Phone screen OFF / Pocket Mode background execution
 * - Real GPS and Simulated Motorcycle Ride modes
 * - Automatic re-routing upon leaving planned route
 * - Wi-Fi connection handling with auto-reconnect backoff
 * - Google Maps-style turn-by-turn navigation with free Nominatim search and OSRM routing
 */

import React, { useState, useEffect } from 'react';
import { HomeScreen } from './ui/HomeScreen';
import { RoutePreviewScreen } from './ui/RoutePreviewScreen';
import { NavigationScreen } from './ui/NavigationScreen';
import { DashboardModal } from './ui/DashboardModal';
import { AndroidNativeSourceModal } from './ui/AndroidNativeSourceModal';
import { Destination, Location, Route } from './types/navigation';
import { locationRepository, LocationMode } from './location/LocationRepository';
import { navigationEngine } from './navigation/NavigationEngine';
import { dashboardManager } from './dashboard/DashboardConnectionManager';
import { Radio, MapPin, Gauge } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'HOME' | 'ROUTE_PREVIEW' | 'NAVIGATION'>('HOME');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(locationRepository.getLastKnownLocation());
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);

  // Modals
  const [showDashboardSimulator, setShowDashboardSimulator] = useState(false);
  const [showAndroidSource, setShowAndroidSource] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>(locationRepository.getMode());

  // Listen to GPS updates
  useEffect(() => {
    const unsubLoc = locationRepository.onLocationUpdate((loc) => {
      setCurrentLocation(loc);
    });

    // Auto-connect to Himalayan 450 cluster on launch
    dashboardManager.connect().catch(() => {});

    return () => {
      unsubLoc();
    };
  }, []);

  const handleOpenSearch = () => {
    setSelectedDestination(null);
    setCurrentScreen('ROUTE_PREVIEW');
  };

  const handleSelectRecentDestination = (dest: Destination) => {
    setSelectedDestination(dest);
    setCurrentScreen('ROUTE_PREVIEW');
  };

  const handleStartNavigation = (origin: Destination, destination: Destination, route: Route) => {
    navigationEngine.startNavigation(origin, destination, route);
    setCurrentScreen('NAVIGATION');
  };

  const handleEndNavigation = () => {
    navigationEngine.stopNavigation();
    setCurrentScreen('HOME');
  };

  const handleToggleLocationMode = () => {
    const nextMode: LocationMode = locationMode === 'SIMULATED' ? 'REAL_GPS' : 'SIMULATED';
    setLocationMode(nextMode);
    locationRepository.setMode(nextMode);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Motorcycle Bar (GPS toggle & Quick Dashboard Access) */}
      {currentScreen !== 'NAVIGATION' && (
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-xs z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-zinc-300 tracking-wider">HIMALAYAN 450</span>
          </div>

          <div className="flex items-center gap-2">
            {/* GPS Source Toggle: Real Phone GPS vs Simulated Motorcycle Ride */}
            <button
              onClick={handleToggleLocationMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                locationMode === 'SIMULATED'
                  ? 'bg-cyan-950 border-cyan-700/60 text-cyan-300'
                  : 'bg-emerald-950 border-emerald-700/60 text-emerald-300'
              }`}
              title="Toggle between Real Phone GPS and Simulated Motorcycle Ride"
            >
              <Radio className="w-3 h-3" />
              <span>{locationMode === 'SIMULATED' ? 'Ride Sim (55 km/h)' : 'Real Phone GPS'}</span>
            </button>

            {/* Quick Tripper Dash Launcher */}
            <button
              onClick={() => setShowDashboardSimulator(true)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
              title="Open Royal Enfield Tripper Dash Display"
            >
              <Gauge className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      )}

      {/* Main Screen Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {currentScreen === 'HOME' && (
          <HomeScreen
            currentLocation={currentLocation}
            onOpenSearch={handleOpenSearch}
            onSelectDestination={handleSelectRecentDestination}
            onOpenDashboardSimulator={() => setShowDashboardSimulator(true)}
            onOpenAndroidSource={() => setShowAndroidSource(true)}
          />
        )}

        {currentScreen === 'ROUTE_PREVIEW' && (
          <RoutePreviewScreen
            currentLocation={currentLocation}
            initialDestination={selectedDestination}
            onStartNavigation={handleStartNavigation}
            onCancel={() => setCurrentScreen('HOME')}
          />
        )}

        {currentScreen === 'NAVIGATION' && (
          <NavigationScreen
            onEndNavigation={handleEndNavigation}
            onOpenDashboardSimulator={() => setShowDashboardSimulator(true)}
          />
        )}
      </main>

      {/* Royal Enfield Himalayan 450 Tripper Dash Simulator Modal */}
      {showDashboardSimulator && (
        <DashboardModal onClose={() => setShowDashboardSimulator(false)} />
      )}

      {/* Native Android Kotlin Code & Architecture Modal */}
      {showAndroidSource && (
        <AndroidNativeSourceModal onClose={() => setShowAndroidSource(false)} />
      )}
    </div>
  );
}
