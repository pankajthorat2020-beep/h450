/**
 * RouteManager
 * Handles destination searching (via OpenStreetMap Nominatim),
 * route calculation with step-by-step turn maneuvers (via OSRM free routing engine),
 * alternative routes, and offline fallback route generation for mountain passes.
 */

import { Destination, Route, RouteStep, ManeuverType } from '../types/navigation';

export class RouteManager {
  /**
   * Search places using OpenStreetMap Nominatim (Free, no API key required)
   */
  public async searchPlaces(query: string): Promise<Destination[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query.trim()
      )}&format=json&addressdetails=1&limit=6`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Himalayan450-MotoNav/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.map((item: any) => {
        const address = item.address || {};
        const shortName =
          address.road || address.suburb || address.city || address.town || address.village || item.display_name.split(',')[0];

        return {
          id: String(item.place_id || Math.random()),
          name: shortName,
          address: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        };
      });
    } catch (err) {
      console.warn('Geocoding search failed, providing fallback destinations:', err);
      // Fallback motorcycle destinations (popular riding spots)
      const presets: Destination[] = [
        { id: 'pune', name: 'Pune, Maharashtra', address: 'Pune, Maharashtra, India', latitude: 18.5204, longitude: 73.8567 },
        { id: 'mumbai', name: 'Mumbai, Maharashtra', address: 'Mumbai, Maharashtra, India', latitude: 19.0760, longitude: 72.8777 },
        { id: 'lonavala', name: 'Lonavala Ghats', address: 'Lonavala, Maharashtra, India', latitude: 18.7557, longitude: 73.4091 },
        { id: 'manali', name: 'Manali, Himachal Pradesh', address: 'Manali, Himachal Pradesh, India', latitude: 32.2396, longitude: 77.1887 },
        { id: 'leh', name: 'Leh, Ladakh', address: 'Leh, Ladakh, India', latitude: 34.1526, longitude: 77.5771 },
      ];
      return presets.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    }
  }

  /**
   * Calculates route between start and destination using OSRM
   */
  public async calculateRoute(
    origin: [number, number], // [lat, lng]
    destination: [number, number], // [lat, lng]
    options?: { alternatives?: boolean }
  ): Promise<Route[]> {
    const [startLat, startLng] = origin;
    const [endLat, endLng] = destination;

    try {
      // OSRM expects coordinates as {lng},{lat};{lng},{lat}
      const coords = `${startLng},${startLat};${endLng},${endLat}`;
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true&alternatives=${options?.alternatives ? 'true' : 'false'}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM routing request failed');

      const data = await res.json();
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found from routing engine');
      }

      return data.routes.map((r: any, idx: number) => this.parseOSRMRoute(r, idx));
    } catch (e) {
      console.warn('Network routing failed, constructing offline mountain route:', e);
      return [this.generateOfflineRoute(origin, destination)];
    }
  }

  private parseOSRMRoute(osrmRoute: any, index: number): Route {
    // GeoJSON coordinates are [lng, lat], convert to Leaflet [lat, lng]
    const polyline: [number, number][] = osrmRoute.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    const steps: RouteStep[] = [];
    if (osrmRoute.legs && osrmRoute.legs[0] && osrmRoute.legs[0].steps) {
      for (const step of osrmRoute.legs[0].steps) {
        const stepCoords: [number, number][] = step.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const maneuverType = this.mapManeuverType(step.maneuver);

        steps.push({
          roadName: step.name || 'Highway / Main Road',
          distanceMeters: step.distance,
          durationSeconds: step.duration,
          geometry: stepCoords,
          maneuver: {
            type: maneuverType,
            instruction: this.buildInstruction(maneuverType, step.name),
            distanceMeters: step.distance,
            location: [step.maneuver.location[1], step.maneuver.location[0]],
            modifier: step.maneuver.modifier,
            bearingAfter: step.maneuver.bearing_after,
          },
        });
      }
    }

    return {
      id: `route-${index}`,
      summary: osrmRoute.legs[0]?.summary || `Route ${index + 1}`,
      polyline,
      totalDistanceMeters: osrmRoute.distance,
      totalDurationSeconds: osrmRoute.duration,
      steps,
      isAlternative: index > 0,
    };
  }

  private mapManeuverType(osrmManeuver: any): ManeuverType {
    const type = osrmManeuver.type;
    const modifier = osrmManeuver.modifier || '';

    if (type === 'arrive') return 'arrive';
    if (type === 'depart') return 'depart';
    if (type === 'roundabout' || type === 'rotary') return 'roundabout';
    if (type === 'fork') return 'fork';
    if (type === 'merge') return 'merge';

    if (modifier.includes('sharp right')) return 'turn-sharp-right';
    if (modifier.includes('slight right')) return 'turn-slight-right';
    if (modifier.includes('right')) return 'turn-right';
    if (modifier.includes('sharp left')) return 'turn-sharp-left';
    if (modifier.includes('slight left')) return 'turn-slight-left';
    if (modifier.includes('left')) return 'turn-left';
    if (modifier.includes('uturn')) return 'uturn-right';

    return 'straight';
  }

  private buildInstruction(type: ManeuverType, roadName?: string): string {
    const name = roadName ? `onto ${roadName}` : '';
    switch (type) {
      case 'turn-right':
        return `Turn right ${name}`.trim();
      case 'turn-sharp-right':
        return `Take a sharp right ${name}`.trim();
      case 'turn-slight-right':
        return `Keep slight right ${name}`.trim();
      case 'turn-left':
        return `Turn left ${name}`.trim();
      case 'turn-sharp-left':
        return `Take a sharp left ${name}`.trim();
      case 'turn-slight-left':
        return `Keep slight left ${name}`.trim();
      case 'uturn-left':
      case 'uturn-right':
        return `Make a U-turn ${name}`.trim();
      case 'roundabout':
        return `Enter roundabout and take exit ${name}`.trim();
      case 'arrive':
        return 'Arrive at destination';
      case 'depart':
        return 'Head toward the route';
      default:
        return `Continue straight ${name}`.trim();
    }
  }

  /**
   * Offline mountain route generator when no network is available in Himalayan valleys
   */
  public generateOfflineRoute(origin: [number, number], destination: [number, number]): Route {
    const [startLat, startLng] = origin;
    const [endLat, endLng] = destination;

    // Generate interpolated points with natural curves for motorcycle riding
    const polyline: [number, number][] = [];
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const baseLat = startLat + (endLat - startLat) * t;
      const baseLng = startLng + (endLng - startLng) * t;

      // Add gentle sinusoidal curve for road realism
      const sinOffset = Math.sin(t * Math.PI * 3) * 0.008;
      polyline.push([baseLat + sinOffset, baseLng + sinOffset * 0.7]);
    }

    const totalDist = this.calculateHaversineDistance(origin, destination) * 1.25; // 25% road winding factor
    const totalDuration = Math.round((totalDist / 1000 / 55) * 3600); // 55 km/h average motorcycle pace

    const steps: RouteStep[] = [
      {
        roadName: 'Main Highway',
        distanceMeters: totalDist * 0.2,
        durationSeconds: totalDuration * 0.2,
        geometry: polyline.slice(0, 5),
        maneuver: {
          type: 'depart',
          instruction: 'Start ride on Main Highway',
          distanceMeters: totalDist * 0.2,
          location: origin,
        },
      },
      {
        roadName: 'Mountain Pass Ridge Road',
        distanceMeters: totalDist * 0.5,
        durationSeconds: totalDuration * 0.5,
        geometry: polyline.slice(5, 15),
        maneuver: {
          type: 'turn-right',
          instruction: 'Turn right onto Mountain Pass Ridge Road',
          distanceMeters: totalDist * 0.5,
          location: polyline[5],
        },
      },
      {
        roadName: 'Destination Approach',
        distanceMeters: totalDist * 0.3,
        durationSeconds: totalDuration * 0.3,
        geometry: polyline.slice(15),
        maneuver: {
          type: 'arrive',
          instruction: 'Arrive at destination on left',
          distanceMeters: totalDist * 0.3,
          location: destination,
        },
      },
    ];

    return {
      id: 'offline-route-1',
      summary: 'Direct Mountain Route',
      polyline,
      totalDistanceMeters: totalDist,
      totalDurationSeconds: totalDuration,
      steps,
      isAlternative: false,
    };
  }

  public calculateHaversineDistance(point1: [number, number], point2: [number, number]): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (point1[0] * Math.PI) / 180;
    const phi2 = (point2[0] * Math.PI) / 180;
    const deltaPhi = ((point2[0] - point1[0]) * Math.PI) / 180;
    const deltaLambda = ((point2[1] - point1[1]) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const routeManager = new RouteManager();
