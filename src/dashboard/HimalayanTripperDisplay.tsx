/**
 * HimalayanTripperDisplay
 * High-fidelity replica of the Royal Enfield Himalayan 450 circular 4.0" TFT Tripper Dash cluster.
 * 
 * Supports:
 * - Turn-by-Turn Minimalist Navigation Mode
 * - Full Map Navigation Mirroring Mode (switched via joystick)
 * - Real-time RPM arc, Gear Indicator (1-6, N), Speedometer
 * - Distance-to-turn countdown progress ring
 * - Wi-Fi connection indicator & Pairing status
 */

import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  ArrowUp, 
  ArrowUpRight, 
  ArrowRight, 
  ArrowDownRight, 
  ArrowDownLeft, 
  ArrowLeft, 
  ArrowUpLeft, 
  RotateCcw, 
  Wifi, 
  WifiOff, 
  Compass, 
  Map as MapIcon, 
  Sliders, 
  CheckCircle2 
} from 'lucide-react';
import { DashboardTelemetryPacket, ManeuverType } from '../types/navigation';
import { dashboardManager } from './DashboardConnectionManager';

interface HimalayanTripperDisplayProps {
  telemetry?: DashboardTelemetryPacket | null;
  compact?: boolean;
}

export const HimalayanTripperDisplay: React.FC<HimalayanTripperDisplayProps> = ({
  telemetry: propTelemetry,
  compact = false,
}) => {
  const [telemetry, setTelemetry] = useState<DashboardTelemetryPacket | null>(propTelemetry || null);
  const [connectionStatus, setConnectionStatus] = useState(dashboardManager.getStatus());
  const [displayMode, setDisplayMode] = useState<'TBT' | 'FULL_MAP'>('TBT');

  useEffect(() => {
    if (propTelemetry) {
      setTelemetry(propTelemetry);
    }
  }, [propTelemetry]);

  useEffect(() => {
    const unsubStatus = dashboardManager.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    const unsubTelemetry = dashboardManager.onTelemetryUpdate((packet) => {
      setTelemetry(packet);
    });

    return () => {
      unsubStatus();
      unsubTelemetry();
    };
  }, []);

  const speed = telemetry?.currentSpeedKmh ?? 0;
  const gear = telemetry?.gearIndicator ?? (speed > 2 ? '3' : 'N');
  const rpm = telemetry?.rpm ?? (speed > 0 ? 3500 : 1200);
  const maxRpm = 9000;
  const rpmPercent = Math.min(100, Math.max(0, (rpm / maxRpm) * 100));

  // Determine Turn Maneuver Icon
  const renderManeuverIcon = (type?: ManeuverType | string, sizeClass = 'w-16 h-16') => {
    switch (type) {
      case 'turn-sharp-right':
      case 'turn-right':
        return <ArrowRight className={`${sizeClass} text-cyan-400 stroke-[2.5]`} />;
      case 'turn-slight-right':
        return <ArrowUpRight className={`${sizeClass} text-cyan-400 stroke-[2.5]`} />;
      case 'turn-sharp-left':
      case 'turn-left':
        return <ArrowLeft className={`${sizeClass} text-cyan-400 stroke-[2.5]`} />;
      case 'turn-slight-left':
        return <ArrowUpLeft className={`${sizeClass} text-cyan-400 stroke-[2.5]`} />;
      case 'uturn-left':
      case 'uturn-right':
        return <RotateCcw className={`${sizeClass} text-cyan-400 stroke-[2.5]`} />;
      case 'arrive':
        return <CheckCircle2 className={`${sizeClass} text-emerald-400 stroke-[2.5]`} />;
      default:
        return <ArrowUp className={`${sizeClass} text-cyan-400 stroke-[2.5]`} />;
    }
  };

  const getDistanceText = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  return (
    <div className={`flex flex-col items-center select-none ${compact ? 'p-2' : 'p-4'}`}>
      {/* Outer Motorcycle Cluster Bezel (Circular 4-inch TFT) */}
      <div 
        className={`relative rounded-full aspect-square bg-zinc-950 border-[10px] border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_25px_rgba(0,0,0,0.9)] flex flex-col items-center justify-between overflow-hidden transition-all duration-300 ${
          compact ? 'w-64 h-64 border-[8px]' : 'w-80 sm:w-96 sm:h-96'
        }`}
        style={{
          boxShadow: '0 0 0 2px #3f3f46, 0 10px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.9)',
        }}
      >
        {/* Tachometer RPM Arc along upper rim */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="#27272a"
            strokeWidth="5"
            strokeDasharray="400"
            strokeDashoffset="120"
            strokeLinecap="round"
            transform="rotate(135 100 100)"
          />
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={rpm > 7500 ? '#ef4444' : '#06b6d4'}
            strokeWidth="6"
            strokeDasharray="400"
            strokeDashoffset={400 - (rpmPercent / 100) * 280}
            strokeLinecap="round"
            transform="rotate(135 100 100)"
            className="transition-all duration-150"
          />
        </svg>

        {/* TOP STATUS BAR: Royal Enfield Brand, Wi-Fi status, Clock */}
        <div className="w-full pt-4 px-6 flex items-center justify-between text-[11px] font-semibold text-zinc-400 z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-red-500 font-black tracking-widest text-[9px] uppercase">HIMALAYAN</span>
            <span className="text-[9px] text-zinc-500">450</span>
          </div>

          {/* Wi-Fi & Connection status */}
          <div className="flex items-center gap-1">
            {connectionStatus === 'CONNECTED' ? (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded-full text-[10px]">
                <Wifi className="w-3 h-3 animate-pulse" />
                <span>Wi-Fi</span>
              </span>
            ) : connectionStatus === 'CONNECTING' || connectionStatus === 'RECONNECTING' ? (
              <span className="flex items-center gap-1 text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded-full text-[10px]">
                <Wifi className="w-3 h-3 animate-spin" />
                <span>Connecting</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded-full text-[10px]">
                <WifiOff className="w-3 h-3 text-red-400" />
                <span>Offline</span>
              </span>
            )}
          </div>

          <div className="text-zinc-300 font-mono text-[10px]">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* CENTER DISPLAY AREA */}
        {displayMode === 'TBT' ? (
          <div className="flex-1 w-full flex flex-col items-center justify-center px-4 text-center z-10">
            {/* Speed & Gear Badge */}
            <div className="flex items-center justify-center gap-3 mb-1">
              <div className="flex items-baseline">
                <span className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-white">
                  {speed}
                </span>
                <span className="text-[10px] uppercase font-bold text-zinc-400 ml-1">km/h</span>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-zinc-700 bg-zinc-900 flex items-center justify-center font-bold text-cyan-400 text-sm">
                {gear}
              </div>
            </div>

            {/* Navigation Maneuver Box */}
            {telemetry?.status === 'NAVIGATING' || telemetry?.status === 'REROUTING' ? (
              <div className="flex flex-col items-center my-0.5">
                <div className="p-2 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 shadow-inner">
                  {renderManeuverIcon(telemetry.nextManeuverIcon, compact ? 'w-10 h-10' : 'w-14 h-14')}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono">
                    {getDistanceText(telemetry.distanceToTurnMeters)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-zinc-200 line-clamp-1 max-w-[220px]">
                  {telemetry.nextInstruction}
                </p>
              </div>
            ) : telemetry?.status === 'ARRIVED' ? (
              <div className="flex flex-col items-center py-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-1" />
                <span className="text-lg font-bold text-emerald-300">You Have Arrived</span>
                <span className="text-xs text-zinc-400">{telemetry.destinationName}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center py-3 text-zinc-500">
                <Compass className="w-10 h-10 mb-1 opacity-40 text-cyan-400" />
                <span className="text-xs font-medium text-zinc-400">Tripper Ready</span>
                <span className="text-[10px] text-zinc-500">Select destination on phone</span>
              </div>
            )}
          </div>
        ) : (
          /* Full Map View Mode */
          <div className="flex-1 w-full relative flex flex-col items-center justify-center p-3 text-center z-10 overflow-hidden">
            <div className="absolute inset-2 rounded-full overflow-hidden border border-zinc-700/50 bg-zinc-900 flex flex-col items-center justify-center">
              {/* Simulated Screen Mirroring feed */}
              <div className="relative w-full h-full flex flex-col items-center justify-between p-4 bg-gradient-to-b from-sky-950/30 to-zinc-950">
                <div className="w-full flex justify-between items-center text-[10px] text-zinc-400">
                  <span className="text-cyan-400 font-bold">{speed} km/h</span>
                  <span className="bg-zinc-800 px-1.5 rounded">MAP CAST</span>
                  <span>{telemetry?.etaString || '--:--'}</span>
                </div>

                <div className="flex flex-col items-center">
                  <Navigation className="w-8 h-8 text-cyan-400 drop-shadow-md transform -rotate-45" />
                  <span className="text-xs font-bold text-white mt-1">
                    {telemetry?.currentRoad || 'Tripper Live Stream'}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {getDistanceText(telemetry?.distanceToTurnMeters || 0)} • {telemetry?.nextInstruction || 'Straight'}
                  </span>
                </div>

                <div className="text-[9px] text-zinc-500">
                  {telemetry?.totalDistanceMeters ? `${(telemetry.totalDistanceMeters / 1000).toFixed(1)} km to ${telemetry.destinationName}` : 'Standby'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM METRICS BAR */}
        <div className="w-full pb-4 px-6 flex items-center justify-between text-[10px] font-semibold text-zinc-400 z-10">
          <div className="flex flex-col items-start">
            <span className="text-[8px] text-zinc-500 uppercase">Trip/Rem</span>
            <span className="text-zinc-200 font-mono">
              {telemetry?.totalDistanceMeters ? `${(telemetry.totalDistanceMeters / 1000).toFixed(1)} km` : '-- km'}
            </span>
          </div>

          {/* Current Road Pill */}
          <div className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-300 max-w-[130px] truncate">
            {telemetry?.currentRoad || 'Tripper Active'}
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[8px] text-zinc-500 uppercase">ETA</span>
            <span className="text-zinc-200 font-mono">{telemetry?.etaString || '--:--'}</span>
          </div>
        </div>

        {/* Reflection Glass Sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none rounded-full" />
      </div>

      {/* Handlebar Joystick Toggle Simulation */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setDisplayMode(displayMode === 'TBT' ? 'FULL_MAP' : 'TBT')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
          title="Simulate Handlebar 5-Way Joystick Press"
        >
          {displayMode === 'TBT' ? <MapIcon className="w-3.5 h-3.5 text-cyan-400" /> : <Sliders className="w-3.5 h-3.5 text-cyan-400" />}
          <span>Toggle Dash Mode ({displayMode === 'TBT' ? 'Turn-by-Turn' : 'Full Map'})</span>
        </button>
      </div>
    </div>
  );
};
