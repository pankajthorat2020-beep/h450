/**
 * HomeScreen
 * Minimalist, high-readability home interface for Royal Enfield Himalayan 450 riders.
 */

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Search, 
  Navigation, 
  Wifi, 
  WifiOff, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Smartphone,
  Gauge
} from 'lucide-react';
import { Destination, Location, DashboardConnectionStatus } from '../types/navigation';
import { dashboardManager } from '../dashboard/DashboardConnectionManager';

interface HomeScreenProps {
  currentLocation: Location | null;
  onOpenSearch: () => void;
  onSelectDestination: (dest: Destination) => void;
  onOpenDashboardSimulator: () => void;
  onOpenAndroidSource: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentLocation,
  onOpenSearch,
  onSelectDestination,
  onOpenDashboardSimulator,
  onOpenAndroidSource,
}) => {
  const [dashboardStatus, setDashboardStatus] = useState<DashboardConnectionStatus>(dashboardManager.getStatus());

  useEffect(() => {
    return dashboardManager.onStatusChange((status) => {
      setDashboardStatus(status);
    });
  }, []);

  const recentDestinations: Destination[] = [
    {
      id: 'recent-1',
      name: 'Pune',
      address: 'Pune, Maharashtra, India',
      latitude: 18.5204,
      longitude: 73.8567,
      isRecent: true,
    },
    {
      id: 'recent-2',
      name: 'Mumbai',
      address: 'Mumbai, Maharashtra, India',
      latitude: 19.0760,
      longitude: 72.8777,
      isRecent: true,
    },
    {
      id: 'recent-3',
      name: 'Lonavala Ghats',
      address: 'Lonavala, Western Ghats, Maharashtra',
      latitude: 18.7557,
      longitude: 73.4091,
      isRecent: true,
    },
    {
      id: 'recent-4',
      name: 'Rohtang Pass',
      address: 'Leh-Manali Highway, Himachal Pradesh',
      latitude: 32.3716,
      longitude: 77.2466,
      isRecent: true,
    },
  ];

  return (
    <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full p-5 bg-zinc-950 text-white select-none">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-black tracking-widest text-xs uppercase">ROYAL ENFIELD</span>
              <span className="text-zinc-600">|</span>
              <span className="text-xs font-semibold text-zinc-300">Himalayan 450</span>
            </div>
            <h1 className="text-2xl font-black tracking-wider uppercase mt-0.5 text-zinc-100">
              NAVIGATION
            </h1>
          </div>

          {/* Himalayan 450 Wi-Fi Indicator Button */}
          <button
            onClick={onOpenDashboardSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shadow-sm ${
              dashboardStatus === 'CONNECTED'
                ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                : dashboardStatus === 'CONNECTING' || dashboardStatus === 'RECONNECTING'
                ? 'bg-amber-950/70 border-amber-700/60 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {dashboardStatus === 'CONNECTED' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dash Connected</span>
              </>
            ) : dashboardStatus === 'CONNECTING' || dashboardStatus === 'RECONNECTING' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Wi-Fi Pairing</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>Connect Dash</span>
              </>
            )}
          </button>
        </div>

        {/* Current Location Card */}
        <div className="mt-6 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3 shadow-md">
          <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <MapPin className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Current Location
            </span>
            <p className="text-sm font-bold text-zinc-100 truncate">
              {currentLocation ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)} (GPS Locked)` : 'Acquiring GPS fix...'}
            </p>
          </div>
        </div>

        {/* Search Destination Trigger */}
        <div className="mt-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Where do you want to go?
          </label>
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 text-left transition shadow-lg group"
          >
            <Search className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-base text-zinc-400 font-medium flex-1">
              Search destination or address...
            </span>
          </button>
        </div>

        {/* Recent Destinations */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Recent Destinations
            </span>
          </div>

          <div className="space-y-2.5">
            {recentDestinations.map((dest) => (
              <button
                key={dest.id}
                onClick={() => onSelectDestination(dest)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 transition text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200 group-hover:text-cyan-300 transition-colors">
                      {dest.name}
                    </h4>
                    <p className="text-xs text-zinc-500 truncate max-w-[240px]">
                      {dest.address}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-8 space-y-3 pt-4 border-t border-zinc-900">
        <button
          onClick={onOpenSearch}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-zinc-950 font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-950/40 active:scale-[0.98] transition-all"
        >
          <Navigation className="w-5 h-5 fill-current" />
          <span>Choose Destination</span>
        </button>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={onOpenDashboardSimulator}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition"
          >
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>Tripper Dash View</span>
          </button>
          <button
            onClick={onOpenAndroidSource}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Android Code (Kotlin)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
