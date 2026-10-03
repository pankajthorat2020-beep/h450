/**
 * LocationRepository
 * Manages GPS location updates from Web Geolocation API or a simulated motorcycle test ride.
 */

import { Location } from '../types/navigation';

export type LocationMode = 'REAL_GPS' | 'SIMULATED';

export class LocationRepository {
  private currentMode: LocationMode = 'SIMULATED';
  private lastKnownLocation: Location = {
    latitude: 18.5204, // Default to Pune, India (iconic Royal Enfield hub)
    longitude: 73.8567,
    heading: 45,
    speed: 0,
    altitude: 560,
    accuracy: 8,
    timestamp: Date.now(),
  };

  private listeners: ((loc: Location) => void)[] = [];
  private geoWatchId: number | null = null;
  private simTimer: any = null;

  // Simulation parameters
  private simRoutePoints: [number, number][] = [];
  private simCurrentIndex = 0;
  private simSpeedKmh = 55; // Typical cruising motorcycle speed
  private isSimulatingDeviation = false;

  constructor() {
    this.tryDetectInitialLocation();
  }

  private tryDetectInitialLocation(): void {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.lastKnownLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            heading: pos.coords.heading ?? 0,
            speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
            altitude: pos.coords.altitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          this.notifyListeners(this.lastKnownLocation);
        },
        (_err) => {
          // Keep default location if permission denied
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }

  public setMode(mode: LocationMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    if (mode === 'REAL_GPS') {
      this.stopSimulation();
      this.startRealGps();
    } else {
      this.stopRealGps();
    }
  }

  public getMode(): LocationMode {
    return this.currentMode;
  }

  public getLastKnownLocation(): Location {
    return { ...this.lastKnownLocation };
  }

  public onLocationUpdate(callback: (loc: Location) => void): () => void {
    this.listeners.push(callback);
    callback(this.lastKnownLocation);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  private notifyListeners(loc: Location): void {
    this.listeners.forEach((fn) => {
      try {
        fn(loc);
      } catch (err) {
        console.error('Error in location listener:', err);
      }
    });
  }

  private startRealGps(): void {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      console.warn('Geolocation not supported in this browser.');
      return;
    }

    this.geoWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const speedKmh = pos.coords.speed !== null ? pos.coords.speed * 3.6 : 0;
        const newLoc: Location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading ?? this.lastKnownLocation.heading,
          speed: speedKmh,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        this.lastKnownLocation = newLoc;
        this.notifyListeners(newLoc);
      },
      (err) => {
        console.warn('Real GPS watch error:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );
  }

  private stopRealGps(): void {
    if (this.geoWatchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
    }
  }

  /**
   * Starts a simulated motorcycle ride along an active route polyline
   */
  public startRouteSimulation(polyline: [number, number][], initialSpeedKmh: number = 55): void {
    this.stopSimulation();
    if (!polyline || polyline.length < 2) return;

    this.simRoutePoints = polyline;
    this.simCurrentIndex = 0;
    this.simSpeedKmh = initialSpeedKmh;
    this.isSimulatingDeviation = false;

    // Set initial position
    const [startLat, startLng] = polyline[0];
    this.lastKnownLocation = {
      latitude: startLat,
      longitude: startLng,
      heading: this.calculateBearing(polyline[0], polyline[1]),
      speed: this.simSpeedKmh,
      altitude: 600,
      accuracy: 4,
      timestamp: Date.now(),
    };
    this.notifyListeners(this.lastKnownLocation);

    // Step interval: advance motorcycle position every 800ms
    this.simTimer = setInterval(() => {
      this.advanceSimulationStep();
    }, 800);
  }

  public stopSimulation(): void {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
  }

  public setSimulationSpeed(speedKmh: number): void {
    this.simSpeedKmh = Math.max(10, Math.min(130, speedKmh));
  }

  /**
   * Triggers an intentional off-route deviation to test automatic rerouting
   */
  public triggerSimulatedOffRoute(): void {
    if (!this.simRoutePoints || this.simRoutePoints.length === 0) return;
    this.isSimulatingDeviation = true;

    // Shift coordinates sideways by ~120 meters
    const current = this.lastKnownLocation;
    const deviatedLoc: Location = {
      ...current,
      latitude: current.latitude + 0.0012, // ~130 meters offset
      longitude: current.longitude + 0.0012,
      heading: (current.heading ? current.heading + 90 : 90) % 360,
      speed: 45,
      timestamp: Date.now(),
    };
    this.lastKnownLocation = deviatedLoc;
    this.notifyListeners(deviatedLoc);
  }

  private advanceSimulationStep(): void {
    if (this.isSimulatingDeviation) {
      // Keep moving off-route until reroute recalculates a new route
      this.lastKnownLocation = {
        ...this.lastKnownLocation,
        latitude: this.lastKnownLocation.latitude + 0.0001,
        longitude: this.lastKnownLocation.longitude + 0.0001,
        timestamp: Date.now(),
      };
      this.notifyListeners(this.lastKnownLocation);
      return;
    }

    if (this.simCurrentIndex >= this.simRoutePoints.length - 1) {
      // Arrived at destination
      this.lastKnownLocation = {
        ...this.lastKnownLocation,
        speed: 0,
        timestamp: Date.now(),
      };
      this.notifyListeners(this.lastKnownLocation);
      this.stopSimulation();
      return;
    }

    this.simCurrentIndex++;
    const currentPoint = this.simRoutePoints[this.simCurrentIndex];
    const prevPoint = this.simRoutePoints[this.simCurrentIndex - 1];
    const nextPoint = this.simRoutePoints[Math.min(this.simRoutePoints.length - 1, this.simCurrentIndex + 1)];

    const heading = this.calculateBearing(prevPoint, nextPoint || currentPoint);

    // Minor motorcycle speed fluctuations (cruising realism)
    const speedNoise = (Math.random() - 0.5) * 6;
    const dynamicSpeed = Math.max(20, Math.round(this.simSpeedKmh + speedNoise));

    this.lastKnownLocation = {
      latitude: currentPoint[0],
      longitude: currentPoint[1],
      heading: Math.round(heading),
      speed: dynamicSpeed,
      altitude: 600 + Math.sin(this.simCurrentIndex / 3) * 50,
      accuracy: 3 + Math.random() * 2,
      timestamp: Date.now(),
    };

    this.notifyListeners(this.lastKnownLocation);
  }

  private calculateBearing(p1: [number, number], p2: [number, number]): number {
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;

    return (brng + 360) % 360;
  }
}

export const locationRepository = new LocationRepository();
