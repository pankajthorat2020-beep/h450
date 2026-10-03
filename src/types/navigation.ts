/**
 * Core navigation state and data types for the Royal Enfield Himalayan 450 Navigation System.
 */

export interface Location {
  latitude: number;
  longitude: number;
  heading: number | null; // degrees 0-360
  speed: number | null; // km/h
  altitude: number | null; // meters
  accuracy: number | null; // meters
  timestamp: number;
}

export interface Destination {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  isRecent?: boolean;
}

export type ManeuverType =
  | 'straight'
  | 'turn-slight-right'
  | 'turn-right'
  | 'turn-sharp-right'
  | 'turn-slight-left'
  | 'turn-left'
  | 'turn-sharp-left'
  | 'uturn-left'
  | 'uturn-right'
  | 'roundabout'
  | 'fork'
  | 'merge'
  | 'arrive'
  | 'depart';

export interface Maneuver {
  type: ManeuverType;
  instruction: string;
  modifier?: string;
  distanceMeters: number;
  location: [number, number]; // [lat, lng]
  bearingAfter?: number;
  roundaboutExit?: number;
}

export interface RouteStep {
  maneuver: Maneuver;
  distanceMeters: number;
  durationSeconds: number;
  roadName: string;
  geometry: [number, number][]; // Array of [lat, lng]
}

export interface Route {
  id: string;
  summary: string;
  polyline: [number, number][]; // [lat, lng]
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  steps: RouteStep[];
  isAlternative?: boolean;
}

export interface NavigationState {
  isNavigating: boolean;
  currentLocation: Location | null;
  origin: Destination | null;
  destination: Destination | null;
  activeRoute: Route | null;
  currentRoad: string | null;
  nextInstruction: string | null;
  nextManeuver: Maneuver | null;
  distanceToNextManeuver: number | null; // in meters
  remainingDistance: number | null; // in meters
  remainingDuration: number | null; // in seconds
  eta: string | null; // e.g. "4:35 PM"
  routeProgress: number; // 0.0 to 1.0
  gpsAccuracy: number | null;
  isOffRoute: boolean;
  speedKmh: number;
  currentStepIndex: number;
  hasArrived: boolean;
  lastRerouteTimestamp?: number;
}

export type DashboardConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR';

export interface DashboardTelemetryPacket {
  version: number;
  sequenceId: number;
  status: 'NAVIGATING' | 'REROUTING' | 'ARRIVED' | 'IDLE';
  maneuverCode: number;
  nextManeuverIcon: string;
  distanceToTurnMeters: number;
  nextInstruction: string;
  currentRoad: string;
  destinationName: string;
  totalDistanceMeters: number;
  etaString: string;
  progressPercent: number;
  currentSpeedKmh: number;
  gearIndicator?: string;
  rpm?: number;
  timestamp: number;
}
