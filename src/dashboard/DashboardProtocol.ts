/**
 * Himalayan 450 Dashboard Protocol Definition
 *
 * CRITICAL ARCHITECTURAL SEPARATION:
 * -----------------------------------
 * VERIFIED:
 * 1. Physical Layer: Wi-Fi connection established between smartphone and Himalayan 450 cluster (Tripper Dash).
 * 2. Hardware: 4.0-inch circular TFT color display (480x480 resolution).
 * 3. Pairing: 6-digit pairing PIN shown on motorcycle TFT cluster during initial Wi-Fi handshakes.
 * 4. Display Modes: Supports Turn-by-Turn arrow view and full map streaming, switchable via handlebar 5-way joystick.
 *
 * ASSUMED:
 * 1. Low-power standalone Turn-by-Turn telemetry utilizes a lightweight TCP/UDP telemetry stream (Port 8088 / 9876)
 *    or local HTTP POST/WebSocket to minimize phone battery consumption when phone screen is OFF.
 * 2. Binary / JSON message payload schema (documented below).
 *
 * MOCK:
 * 1. In development, a MockDashboardTransport is provided that emulates the Wi-Fi socket,
 *    allowing the real-time circular Tripper Dash simulator to render turns synchronously.
 *
 * HIMALAYAN_DASHBOARD_PROTOCOL_REQUIRED:
 * When official Royal Enfield OEM socket specifications or CAN-to-Wi-Fi gateway binary frames become available,
 * replace the encoder and transport implementations below without touching UI or NavigationEngine.
 */

import { ManeuverType } from '../types/navigation';

export const HIMALAYAN_DASHBOARD_PROTOCOL_TAG = 'HIMALAYAN_DASHBOARD_PROTOCOL_REQUIRED';

export const HIMALAYAN_MANEUVER_CODES: Record<ManeuverType, number> = {
  'straight': 0x01,
  'turn-slight-right': 0x02,
  'turn-right': 0x03,
  'turn-sharp-right': 0x04,
  'turn-slight-left': 0x05,
  'turn-left': 0x06,
  'turn-sharp-left': 0x07,
  'uturn-left': 0x08,
  'uturn-right': 0x09,
  'roundabout': 0x0A,
  'fork': 0x0B,
  'merge': 0x0C,
  'depart': 0x0D,
  'arrive': 0x0E,
};

export interface HimalayanFrameHeader {
  magic: number; // 0x5245 (RE)
  protocolVersion: number; // 0x01
  payloadLength: number;
  sequenceId: number;
  crc16: number;
}

export interface HimalayanTelemetryPayload {
  state: 'IDLE' | 'NAVIGATING' | 'REROUTING' | 'ARRIVED';
  maneuverCode: number;
  maneuverInstruction: string;
  distanceToTurnMeters: number;
  currentRoadName: string;
  destinationName: string;
  remainingDistanceMeters: number;
  remainingTimeSeconds: number;
  etaString: string;
  progressPercent: number; // 0-100
  speedKmh: number;
}
