/**
 * DashboardMessageEncoder
 * Transforms high-level NavigationState into Himalayan 450 compatible dashboard packets.
 */

import { NavigationState, DashboardTelemetryPacket } from '../types/navigation';
import { HIMALAYAN_MANEUVER_CODES } from './DashboardProtocol';

export class DashboardMessageEncoder {
  private sequenceCounter = 0;

  /**
   * Encodes current NavigationState into a telemetry packet for the Himalayan 450 Tripper Dash.
   */
  public encode(state: NavigationState): DashboardTelemetryPacket {
    this.sequenceCounter = (this.sequenceCounter + 1) % 65536;

    let status: DashboardTelemetryPacket['status'] = 'IDLE';
    if (state.hasArrived) {
      status = 'ARRIVED';
    } else if (state.isOffRoute) {
      status = 'REROUTING';
    } else if (state.isNavigating) {
      status = 'NAVIGATING';
    }

    const maneuverType = state.nextManeuver?.type || 'straight';
    const maneuverCode = HIMALAYAN_MANEUVER_CODES[maneuverType] ?? 0x01;

    return {
      version: 1,
      sequenceId: this.sequenceCounter,
      status,
      maneuverCode,
      nextManeuverIcon: maneuverType,
      distanceToTurnMeters: Math.round(state.distanceToNextManeuver ?? 0),
      nextInstruction: state.nextInstruction || 'Continue straight',
      currentRoad: state.currentRoad || 'Current Route',
      destinationName: state.destination?.name || 'Destination',
      totalDistanceMeters: Math.round(state.remainingDistance ?? 0),
      etaString: state.eta || '--:--',
      progressPercent: Math.min(100, Math.max(0, Math.round(state.routeProgress * 100))),
      currentSpeedKmh: Math.round(state.speedKmh),
      gearIndicator: this.estimateGear(state.speedKmh),
      rpm: this.estimateRpm(state.speedKmh),
      timestamp: Date.now(),
    };
  }

  /**
   * Encodes the packet into a simulated binary frame conforming to RE header
   * [0x52, 0x45] + version + seq + len + JSON/payload
   */
  public encodeToBinary(packet: DashboardTelemetryPacket): Uint8Array {
    const jsonStr = JSON.stringify(packet);
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(jsonStr);

    const frame = new Uint8Array(8 + payloadBytes.length);
    frame[0] = 0x52; // 'R'
    frame[1] = 0x45; // 'E'
    frame[2] = packet.version;
    frame[3] = (packet.sequenceId >> 8) & 0xff;
    frame[4] = packet.sequenceId & 0xff;
    frame[5] = (payloadBytes.length >> 8) & 0xff;
    frame[6] = payloadBytes.length & 0xff;
    frame[7] = packet.maneuverCode;
    frame.set(payloadBytes, 8);

    return frame;
  }

  private estimateGear(speedKmh: number): string {
    if (speedKmh <= 2) return 'N';
    if (speedKmh < 25) return '1';
    if (speedKmh < 45) return '2';
    if (speedKmh < 65) return '3';
    if (speedKmh < 85) return '4';
    if (speedKmh < 105) return '5';
    return '6';
  }

  private estimateRpm(speedKmh: number): number {
    if (speedKmh <= 0) return 1200; // Idle RPM for Sherpa 450
    return Math.min(9000, Math.round(1500 + speedKmh * 55));
  }
}
