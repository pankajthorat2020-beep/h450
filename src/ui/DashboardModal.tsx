/**
 * DashboardModal
 * Visualizer and test suite for the Royal Enfield Himalayan 450 circular TFT Tripper Dash.
 * Allows riders and developers to test Wi-Fi pairing, connection drops, telemetry stream,
 * and view live turn-by-turn maneuvers as if sitting on the motorcycle.
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Sliders, 
  Terminal, 
  Zap, 
  Radio 
} from 'lucide-react';
import { HimalayanTripperDisplay } from '../dashboard/HimalayanTripperDisplay';
import { dashboardManager } from '../dashboard/DashboardConnectionManager';
import { DashboardConnectionStatus, DashboardTelemetryPacket } from '../types/navigation';
import { HIMALAYAN_DASHBOARD_PROTOCOL_TAG } from '../dashboard/DashboardProtocol';
import { MockHimalayanTransport } from '../dashboard/DashboardTransport';

interface DashboardModalProps {
  onClose: () => void;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<DashboardConnectionStatus>(dashboardManager.getStatus());
  const [pairingPin, setPairingPin] = useState(dashboardManager.getPairingPin());
  const [latestPacket, setLatestPacket] = useState<DashboardTelemetryPacket | null>(null);
  const [activeTab, setActiveTab] = useState<'CLUSTER' | 'PACKETS' | 'PROTOCOL'>('CLUSTER');

  useEffect(() => {
    const unsubStatus = dashboardManager.onStatusChange((s) => setStatus(s));
    const unsubTelem = dashboardManager.onTelemetryUpdate((p) => setLatestPacket(p));
    return () => {
      unsubStatus();
      unsubTelem();
    };
  }, []);

  const handleConnect = async () => {
    dashboardManager.setPairingPin(pairingPin);
    await dashboardManager.connect();
  };

  const handleDisconnect = async () => {
    await dashboardManager.disconnect();
  };

  const handleSimulateDrop = () => {
    const transport = dashboardManager.getTransport();
    if (transport instanceof MockHimalayanTransport) {
      transport.simulateConnectionDrop();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-zinc-900 border border-zinc-750 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-black tracking-widest text-xs uppercase">ROYAL ENFIELD</span>
            <span className="text-zinc-600">|</span>
            <h3 className="text-sm font-bold text-zinc-100">Himalayan 450 Tripper Dash</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 p-1">
          <button
            onClick={() => setActiveTab('CLUSTER')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'CLUSTER'
                ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Tripper TFT Cluster
          </button>
          <button
            onClick={() => setActiveTab('PACKETS')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'PACKETS'
                ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Telemetry Packets
          </button>
          <button
            onClick={() => setActiveTab('PROTOCOL')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'PROTOCOL'
                ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Protocol Spec
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
          {activeTab === 'CLUSTER' && (
            <div className="w-full flex flex-col items-center">
              {/* Circular Tripper Instrument Display */}
              <HimalayanTripperDisplay telemetry={latestPacket} />

              {/* Wi-Fi Connection Controls */}
              <div className="w-full mt-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-400">Cluster Wi-Fi Status</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      status === 'CONNECTED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : status === 'CONNECTING' || status === 'RECONNECTING'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {status}
                  </span>
                </div>

                {/* Pairing PIN Input */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400 font-medium">Dashboard PIN:</span>
                  <input
                    type="text"
                    maxLength={6}
                    value={pairingPin}
                    onChange={(e) => setPairingPin(e.target.value)}
                    className="w-24 bg-zinc-900 border border-zinc-750 px-2 py-1 rounded-lg text-center font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-zinc-500">(Default: 450450)</span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {status === 'CONNECTED' ? (
                    <button
                      onClick={handleDisconnect}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <WifiOff className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleConnect}
                      className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/50"
                    >
                      <Wifi className="w-3.5 h-3.5" />
                      <span>Connect to Wi-Fi</span>
                    </button>
                  )}

                  {/* Test Wi-Fi Drop / Auto-reconnection */}
                  <button
                    onClick={handleSimulateDrop}
                    disabled={status !== 'CONNECTED'}
                    className="py-2 px-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40"
                    title="Simulate signal loss to test auto-reconnect"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Test Wi-Fi Drop</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PACKETS' && (
            <div className="w-full space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-2 mb-2">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Radio className="w-3.5 h-3.5" /> Live Wi-Fi Packet Telemetry
                  </span>
                  <span>Seq #{latestPacket?.sequenceId ?? 0}</span>
                </div>

                {latestPacket ? (
                  <pre className="text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed text-[11px]">
                    {JSON.stringify(latestPacket, null, 2)}
                  </pre>
                ) : (
                  <p className="text-zinc-500">No telemetry packets received yet. Start navigation to stream data.</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400">
                <p className="font-bold text-zinc-300 mb-1">Simulated Binary Frame Header:</p>
                <div className="p-2 bg-black rounded font-mono text-cyan-400">
                  52 45 01 {latestPacket ? `${(latestPacket.sequenceId >> 8).toString(16).padStart(2, '0')} ${(latestPacket.sequenceId & 0xff).toString(16).padStart(2, '0')}` : '00 01'} 00 2A {latestPacket?.maneuverCode.toString(16).padStart(2, '0') ?? '01'} ...
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PROTOCOL' && (
            <div className="w-full space-y-3 text-xs text-zinc-300">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <h4 className="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  VERIFIED SPECIFICATION:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
                  <li>Royal Enfield Himalayan 450 Instrument Cluster: 4.0-inch circular TFT.</li>
                  <li>Physical Wi-Fi connection used for casting & navigation streaming.</li>
                  <li>Initial pairing uses a 6-digit PIN shown on the cluster screen.</li>
                  <li>Handlebar 5-way joystick switches between Turn-by-Turn HUD and Full Map.</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ASSUMED & ABSTRACTED SPECIFICATION:
                </h4>
                <p className="text-zinc-400 text-[11px] mb-2">
                  Tag: <code className="text-amber-300 bg-zinc-900 px-1 py-0.5 rounded font-mono">{HIMALAYAN_DASHBOARD_PROTOCOL_TAG}</code>
                </p>
                <p className="text-zinc-400 text-[11px]">
                  Standalone low-power Turn-by-Turn mode operates over a lightweight TCP/UDP telemetry stream (Port 8088 / 9876) allowing the phone screen to turn completely OFF while riding.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <h4 className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  MOCK & TEST IMPLEMENTATION:
                </h4>
                <p className="text-zinc-400 text-[11px]">
                  <code className="text-zinc-300">MockDashboardTransport</code> executes synchronous telemetry handshakes, connection drop simulations, and automatic reconnect backoffs without requiring a physical motorcycle.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
