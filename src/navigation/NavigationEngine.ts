/**
 * NavigationEngine
 * The central brain for turn-by-turn navigation calculations.
 * 
 * Responsibilities:
 * - Subscribes to LocationRepository
 * - Projects rider location onto active Route
 * - Computes step transitions, distance to turn, ETA, progress
 * - Detects off-route conditions and triggers automatic rerouting
 * - Emits clean NavigationState to both UI and DashboardConnectionManager
 */

import { Destination, Location, NavigationState, Route, RouteStep } from '../types/navigation';
import { locationRepository } from '../location/LocationRepository';
import { routeManager } from './RouteManager';
import { dashboardManager } from '../dashboard/DashboardConnectionManager';

export class NavigationEngine {
  private state: NavigationState = {
    isNavigating: false,
    currentLocation: null,
    origin: null,
    destination: null,
    activeRoute: null,
    currentRoad: null,
    nextInstruction: null,
    nextManeuver: null,
    distanceToNextManeuver: null,
    remainingDistance: null,
    remainingDuration: null,
    eta: null,
    routeProgress: 0,
    gpsAccuracy: null,
    isOffRoute: false,
    speedKmh: 0,
    currentStepIndex: 0,
    hasArrived: false,
  };

  private stateListeners: ((state: NavigationState) => void)[] = [];
  private unsubLocation: (() => void) | null = null;
  private isRecalculatingRoute = false;
  private lastAnnouncedStepIndex = -1;
  private voiceEnabled = true;

  constructor() {
    this.initLocationListener();
  }

  private initLocationListener(): void {
    this.unsubLocation = locationRepository.onLocationUpdate((loc) => {
      this.handleLocationUpdate(loc);
    });
  }

  public getState(): NavigationState {
    return { ...this.state };
  }

  public onStateChange(callback: (state: NavigationState) => void): () => void {
    this.stateListeners.push(callback);
    callback(this.state);
    return () => {
      this.stateListeners = this.stateListeners.filter((fn) => fn !== callback);
    };
  }

  public setVoiceEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  private notifyStateChange(): void {
    this.stateListeners.forEach((fn) => {
      try {
        fn(this.state);
      } catch (err) {
        console.error('Error notifying navigation state listener:', err);
      }
    });

    // Send updated navigation telemetry to Himalayan 450 dashboard
    dashboardManager.sendNavigationState(this.state);
  }

  /**
   * Starts navigation session with origin, destination, and calculated route
   */
  public startNavigation(origin: Destination, destination: Destination, route: Route): void {
    const firstStep = route.steps[0];

    this.state = {
      isNavigating: true,
      currentLocation: locationRepository.getLastKnownLocation(),
      origin,
      destination,
      activeRoute: route,
      currentRoad: firstStep?.roadName || 'Main Route',
      nextInstruction: firstStep?.maneuver.instruction || 'Start riding along route',
      nextManeuver: firstStep?.maneuver || null,
      distanceToNextManeuver: firstStep?.distanceMeters || 100,
      remainingDistance: route.totalDistanceMeters,
      remainingDuration: route.totalDurationSeconds,
      eta: this.calculateEta(route.totalDurationSeconds),
      routeProgress: 0,
      gpsAccuracy: 5,
      isOffRoute: false,
      speedKmh: 0,
      currentStepIndex: 0,
      hasArrived: false,
    };

    this.lastAnnouncedStepIndex = -1;
    this.notifyStateChange();

    // Voice announcement for navigation start
    this.speak(`Starting navigation to ${destination.name}. Drive safely.`);

    // If simulated ride, launch simulation along this route
    if (locationRepository.getMode() === 'SIMULATED') {
      locationRepository.startRouteSimulation(route.polyline);
    }
  }

  public stopNavigation(): void {
    this.state = {
      ...this.state,
      isNavigating: false,
      hasArrived: false,
      isOffRoute: false,
    };

    locationRepository.stopSimulation();
    this.notifyStateChange();
    this.speak('Navigation stopped.');
  }

  private handleLocationUpdate(loc: Location): void {
    if (!this.state.isNavigating || !this.state.activeRoute) {
      this.state = {
        ...this.state,
        currentLocation: loc,
        speedKmh: loc.speed ?? 0,
        gpsAccuracy: loc.accuracy,
      };
      this.notifyStateChange();
      return;
    }

    const currentCoord: [number, number] = [loc.latitude, loc.longitude];
    const route = this.state.activeRoute;
    const dest = this.state.destination;

    // Check for Destination Arrival
    if (dest) {
      const distToDest = routeManager.calculateHaversineDistance(currentCoord, [dest.latitude, dest.longitude]);
      if (distToDest < 25) {
        this.state = {
          ...this.state,
          currentLocation: loc,
          speedKmh: 0,
          hasArrived: true,
          isNavigating: false,
          remainingDistance: 0,
          remainingDuration: 0,
          nextInstruction: 'You have arrived at your destination',
          distanceToNextManeuver: 0,
          routeProgress: 1.0,
        };
        this.notifyStateChange();
        this.speak(`You have arrived at ${dest.name}. Ride completed.`);
        return;
      }
    }

    // Check Cross-track deviation (Off-Route detection)
    const { minDistance, closestIndex } = this.findClosestPointOnPolyline(currentCoord, route.polyline);

    // If rider is more than 50 meters away from route, trigger Automatic Re-routing
    if (minDistance > 55 && !this.isRecalculatingRoute) {
      this.handleOffRoute(loc);
      return;
    }

    // Advance step and calculate distance to next maneuver
    let currentStepIdx = this.state.currentStepIndex;
    const steps = route.steps;
    let currentStep = steps[currentStepIdx];

    if (currentStep) {
      const maneuverLoc = currentStep.maneuver.location;
      const distToManeuver = routeManager.calculateHaversineDistance(currentCoord, maneuverLoc);

      // Step transition threshold: 30 meters
      if (distToManeuver < 30 && currentStepIdx < steps.length - 1) {
        currentStepIdx++;
        currentStep = steps[currentStepIdx];
      }

      // Voice guidance for upcoming maneuver
      if (currentStepIdx !== this.lastAnnouncedStepIndex && currentStep) {
        this.lastAnnouncedStepIndex = currentStepIdx;
        this.speak(currentStep.maneuver.instruction);
      }
    }

    // Compute remaining distance & duration
    const progress = Math.min(1, Math.max(0, closestIndex / Math.max(1, route.polyline.length - 1)));
    const remainingDist = Math.max(0, route.totalDistanceMeters * (1 - progress));
    const remainingDur = Math.max(0, Math.round(route.totalDurationSeconds * (1 - progress)));

    const nextManeuver = currentStep?.maneuver || null;
    const distToNextManeuver = nextManeuver
      ? routeManager.calculateHaversineDistance(currentCoord, nextManeuver.location)
      : 0;

    this.state = {
      ...this.state,
      currentLocation: loc,
      speedKmh: loc.speed ?? 0,
      gpsAccuracy: loc.accuracy,
      isOffRoute: false,
      currentStepIndex: currentStepIdx,
      currentRoad: currentStep?.roadName || 'Main Route',
      nextInstruction: currentStep?.maneuver.instruction || 'Continue straight',
      nextManeuver,
      distanceToNextManeuver: distToNextManeuver,
      remainingDistance: remainingDist,
      remainingDuration: remainingDur,
      eta: this.calculateEta(remainingDur),
      routeProgress: progress,
    };

    this.notifyStateChange();
  }

  private async handleOffRoute(loc: Location): Promise<void> {
    const destination = this.state.destination;
    if (this.isRecalculatingRoute || !destination) return;
    this.isRecalculatingRoute = true;

    this.state = {
      ...this.state,
      currentLocation: loc,
      isOffRoute: true,
      nextInstruction: 'Recalculating route...',
    };
    this.notifyStateChange();
    this.speak('Off route. Recalculating.');

    try {
      const newRoutes = await routeManager.calculateRoute(
        [loc.latitude, loc.longitude],
        [destination.latitude, destination.longitude]
      );

      if (newRoutes && newRoutes.length > 0) {
        const newRoute = newRoutes[0];
        const firstStep = newRoute.steps[0];

        this.state = {
          ...this.state,
          activeRoute: newRoute,
          isOffRoute: false,
          currentStepIndex: 0,
          currentRoad: firstStep?.roadName || 'New Route',
          nextInstruction: firstStep?.maneuver.instruction || 'Follow new route',
          nextManeuver: firstStep?.maneuver || null,
          distanceToNextManeuver: firstStep?.distanceMeters || 100,
          remainingDistance: newRoute.totalDistanceMeters,
          remainingDuration: newRoute.totalDurationSeconds,
          eta: this.calculateEta(newRoute.totalDurationSeconds),
          lastRerouteTimestamp: Date.now(),
        };

        if (locationRepository.getMode() === 'SIMULATED') {
          locationRepository.startRouteSimulation(newRoute.polyline);
        }

        this.speak('New route calculated. Continue.');
      }
    } catch (e) {
      console.warn('Rerouting failed:', e);
    } finally {
      this.isRecalculatingRoute = false;
      this.notifyStateChange();
    }
  }

  private findClosestPointOnPolyline(
    point: [number, number],
    polyline: [number, number][]
  ): { minDistance: number; closestIndex: number } {
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < polyline.length; i++) {
      const dist = routeManager.calculateHaversineDistance(point, polyline[i]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    return { minDistance, closestIndex };
  }

  private calculateEta(remainingSeconds: number): string {
    const etaDate = new Date(Date.now() + remainingSeconds * 1000);
    return etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private speak(text: string): void {
    if (!this.voiceEnabled) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        // Voice synthesis might be restricted without user gesture
      }
    }
  }
}

export const navigationEngine = new NavigationEngine();
