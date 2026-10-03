/**
 * NavigationScreen
 * Full-screen Google Maps style navigation tailored for Himalayan 450 riders.
 * Features high-contrast turn maneuver card, current road banner, bottom ETA/distance bar,
 * background pocket/screen-off mode, and real-time Wi-Fi dashboard telemetry sync.
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowUp, 
  ArrowUpRight, 
  ArrowRight, 
  ArrowDownRight, 
  ArrowLeft, 
  ArrowUpLeft, 
  RotateCcw, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  X, 
  Wifi, 
  WifiOff, 
  Moon, 
  Sun, 
  Gauge, 
  AlertTriangle, 
  Compass, 
  Footprints,
  EyeOff,
  Radio
} from 'lucide-react';
import { NavigationState, ManeuverType } from '../types/navigation';
import { navigationEngine } from '../navigation/NavigationEngine';
import { navigationBackgroundService } from '../service/NavigationBackgroundService';
import { locationRepository } from '../location/LocationRepository';
import { dashboardManager } from '../dashboard/DashboardConnectionManager';
import { MapView } from './MapView';

interface NavigationScreenProps {
  onEndNavigation: () => void;
  onOpenDashboardSimulator: () => void;
}

export const NavigationScreen: React.FC<NavigationScreenProps> = ({
  onEndNavigation,
  onOpenDashboardSimulator,
}) => {
  const [navState, setNavState] = useState<NavigationState>(navigationEngine.getState());
  const [voiceEnabled, setVoiceEnabled] = useState(navigationEngine.isVoiceEnabled());
  const [isScreenOff, setIsScreenOff] = useState(navigationBackgroundService.isScreenOff());
  const [dashboardStatus, setDashboardStatus] = useState(dashboardManager.getStatus());

  useEffect(() => {
    // Listen to NavigationEngine updates
    const unsubNav = navigationEngine.onStateChange((state) => {
      setNavState(state);
      navigationBackgroundService.updateBackgroundNotification(state);
    });

    // Listen to Dashboard connection updates
    const unsubDash = dashboardManager.onStatusChange((status) => {
      setDashboardStatus(status);
    });

    // Listen to Screen Off / Pocket mode changes
    const unsubScreen = navigationBackgroundService.onScreenOffChange((off) => {
      setIsScreenOff(off);
    });

    // Request WakeLock while screen is on
    navigationBackgroundService.setWakeLock(true);

    return () => {
      unsubNav();
      unsubDash();
      unsubScreen();
      navigationBackgroundService.setWakeLock(false);
    };
  }, []);

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    navigationEngine.setVoiceEnabled(next);
  };

  const toggleScreenOff = () => {
    navigationBackgroundService.togglePocketScreenOff();
  };

  const handleSimulateOffRoute = () => {
    locationRepository.triggerSimulatedOffRoute();
  };

  const formatDistance = (meters: number | null) => {
    if (meters === null) return '-- m';
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const renderManeuverIcon = (type?: ManeuverType, size = 'w-10 h-10') => {
    switch (type) {
      case 'turn-sharp-right':
      case 'turn-right':
        return <ArrowRight className={`${size} text-white stroke-[3]`} />;
      case 'turn-slight-right':
        return <ArrowUpRight className={`${size} text-white stroke-[3]`} />;
      case 'turn-sharp-left':
      case 'turn-left':
        return <ArrowLeft className={`${size} text-white stroke-[3]`} />;
      case 'turn-slight-left':
        return <ArrowUpLeft className={`${size} text-white stroke-[3]`} />;
      case 'uturn-left':
      case 'uturn-right':
        return <RotateCcw className={`${size} text-white stroke-[3]`} />;
      case 'arrive':
        return <CheckCircle2 className={`${size} text-emerald-400 stroke-[3]`} />;
      default:
        return <ArrowUp className={`${size} text-white stroke-[3]`} />;
    }
  };

  // If Simulated Screen OFF is active (Pocket Mode for rider), render minimalist battery-saving black screen
  if (isScreenOff) {
    return (
      <div 
        onClick={toggleScreenOff}
        className="fixed inset-0 bg-black text-white flex flex-col items-center justify-between p-6 cursor-pointer select-none z-50 transition-opacity"
      >
        <div className="w-full flex items-center justify-between text-xs text-zinc-600 pt-4">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>HIMALAYAN 450 POCKET MODE ACTIVE</span>
          </div>
          <span>TAP ANYWHERE TO WAKE</span>
        </div>

        {/* Minimalist OLED HUD */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 rounded-full border border-zinc-800 bg-zinc-950">
            {renderManeuverIcon(navState.nextManeuver?.type, 'w-14 h-14')}
          </div>
          <div className="text-4xl font-black font-mono text-zinc-100">
            {formatDistance(navState.distanceToNextManeuver)}
          </div>
          <p className="text-base font-semibold text-zinc-400 max-w-xs">
            {navState.nextInstruction}
          </p>
          <div className="text-xs text-zinc-600 uppercase tracking-widest pt-2">
            Screen OFF • Wi-Fi Stream Running to Himalayan 450 Dash
          </div>
        </div>

        <div className="text-xs text-zinc-700 pb-4">
          Tap screen to turn display back ON
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 w-full h-full bg-zinc-950 text-white flex flex-col justify-between overflow-hidden select-none">
      {/* FULL SCREEN MAP */}
      <div className="absolute inset-0 z-0">
        <MapView
          currentLocation={navState.currentLocation}
          origin={navState.origin}
          destination={navState.destination}
          route={navState.activeRoute}
          followRider={true}
          interactive={false}
        />
      </div>

      {/* TOP TURN-BY-TURN MANEUVER BANNER (Google Maps Navigation Style) */}
      <div className="relative z-10 p-4 space-y-2">
        {/* Main Turn Card */}
        <div className="rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-zinc-750 p-4 shadow-2xl flex items-center gap-4">
          {/* Turn Arrow Icon Box */}
          <div className="w-16 h-16 rounded-2xl bg-emerald-700 border border-emerald-500 shadow-lg flex items-center justify-center shrink-0">
            {renderManeuverIcon(navState.nextManeuver?.type, 'w-9 h-9')}
          </div>

          <div className="flex-1 min-w-0">
            {/* Distance to next turn */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono tracking-tight text-white">
                {formatDistance(navState.distanceToNextManeuver)}
              </span>
            </div>

            {/* Instruction text */}
            <p className="text-base sm:text-lg font-bold text-zinc-100 line-clamp-1">
              {navState.nextInstruction || 'Continue straight'}
            </p>
          </div>
        </div>

        {/* Off-Route Alert & Re-routing Banner */}
        {navState.isOffRoute && (
          <div className="rounded-xl bg-amber-950/90 border border-amber-600/80 p-2.5 flex items-center gap-2 text-amber-200 text-xs font-semibold shadow-lg animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Off Route! Recalculating new path for Himalayan 450...</span>
          </div>
        )}
      </div>

      {/* FLOATING ACTION PILLS (Mute, Dash View, Pocket Screen Off, Off-route Test) */}
      <div className="relative z-10 px-4 flex items-center justify-between pointer-events-none">
        {/* Left Side: Himalayan 450 Wi-Fi Status Pill */}
        <button
          onClick={onOpenDashboardSimulator}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-750 text-xs font-semibold shadow-xl hover:bg-zinc-800 transition"
        >
          {dashboardStatus === 'CONNECTED' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Tripper Connected</span>
            </>
          ) : dashboardStatus === 'CONNECTING' || dashboardStatus === 'RECONNECTING' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-amber-300">Connecting Wi-Fi</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span className="text-zinc-400">Dash Offline</span>
            </>
          )}
        </button>

        {/* Right Side: Quick Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Simulate Off-Route Button for testing */}
          <button
            onClick={handleSimulateOffRoute}
            title="Simulate Rider Going Off-Route (Tests Auto Re-routing)"
            className="p-2.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-750 text-zinc-300 hover:text-white shadow-xl hover:bg-zinc-800 transition"
          >
            <Footprints className="w-4 h-4 text-amber-400" />
          </button>

          {/* Voice Mute Toggle */}
          <button
            onClick={toggleVoice}
            className="p-2.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-750 text-zinc-300 hover:text-white shadow-xl hover:bg-zinc-800 transition"
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {/* Screen OFF / Pocket Mode Simulator */}
          <button
            onClick={toggleScreenOff}
            title="Pocket Mode (Simulate Screen OFF to save battery)"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-750 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 shadow-xl transition"
          >
            <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
            <span>Screen OFF</span>
          </button>
        </div>
      </div>

      {/* BOTTOM NAVIGATION STATUS BAR */}
      <div className="relative z-10 p-4 space-y-3">
        {/* Current Road Name Card */}
        <div className="rounded-xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-4 py-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-400">Current Road</span>
          <span className="font-bold text-cyan-300 truncate max-w-[200px]">
            {navState.currentRoad || 'Main Highway'}
          </span>
        </div>

        {/* ETA, Remaining Distance, Speed & Stop Navigation */}
        <div className="rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-zinc-750 p-4 shadow-2xl flex items-center justify-between">
          {/* ETA & Distance */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-white">
                {navState.eta || '--:--'}
              </span>
              <span className="text-xs uppercase font-bold text-zinc-400">ETA</span>
            </div>
            <div className="text-xs font-semibold text-zinc-400 mt-0.5">
              {formatDistance(navState.remainingDistance)} remaining
            </div>
          </div>

          {/* Speedometer Badge */}
          <div className="flex flex-col items-center">
            <span className="text-xl font-mono font-black text-cyan-400">
              {Math.round(navState.speedKmh)}
            </span>
            <span className="text-[9px] uppercase font-bold text-zinc-500">km/h</span>
          </div>

          {/* End Navigation Button */}
          <button
            onClick={onEndNavigation}
            className="w-12 h-12 rounded-2xl bg-red-600/20 hover:bg-red-600 border border-red-500/50 flex items-center justify-center text-red-400 hover:text-white transition shadow-lg"
            title="End Navigation"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
