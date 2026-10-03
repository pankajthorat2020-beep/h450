/**
 * DashboardTransport
 * Transport abstraction layer for communicating with the Himalayan 450 instrument cluster over Wi-Fi.
 */

import { DashboardTelemetryPacket } from '../types/navigation';

export interface DashboardTransport {
  connect(host: string, port: number, pairingPin: string): Promise<boolean>;
  disconnect(): Promise<void>;
  send(packet: DashboardTelemetryPacket, rawBytes: Uint8Array): Promise<boolean>;
  onPacketReceived(callback: (packet: DashboardTelemetryPacket) => void): void;
  onError(callback: (err: Error) => void): void;
  onDisconnect(callback: (reason?: string) => void): void;
  isConnected(): boolean;
  getTransportName(): string;
}

/**
 * MockHimalayanTransport
 * Development and testing transport that simulates motorcycle Wi-Fi connectivity,
 * packet streaming, and event broadcasting to in-app or external Tripper Dash display simulators.
 */
export class MockHimalayanTransport implements DashboardTransport {
  private connected = false;
  private listeners: ((packet: DashboardTelemetryPacket) => void)[] = [];
  private errorListeners: ((err: Error) => void)[] = [];
  private disconnectListeners: ((reason?: string) => void)[] = [];
  private heartbeatTimer: any = null;

  public async connect(host: string, port: number, pairingPin: string): Promise<boolean> {
    // Simulate Wi-Fi socket handshake latency (400ms - 800ms)
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Himalayan 450 pairing PIN check (default '450450' or any 6-digit code)
    if (pairingPin && pairingPin.length === 6) {
      this.connected = true;
      this.startHeartbeat();
      return true;
    } else {
      const err = new Error('Invalid Himalayan 450 Pairing PIN. Must be 6 digits.');
      this.errorListeners.forEach((fn) => fn(err));
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.connected = false;
    this.disconnectListeners.forEach((fn) => fn('Disconnected by user'));
  }

  public async send(packet: DashboardTelemetryPacket, _rawBytes: Uint8Array): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    // Broadcast to local listeners (e.g. Tripper Dash Simulator)
    this.listeners.forEach((listener) => {
      try {
        listener(packet);
      } catch (e) {
        console.error('Error dispatching telemetry to dashboard listener:', e);
      }
    });

    // Also broadcast on window CustomEvent for any connected dashboard component
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('himalayan-dashboard-packet', {
          detail: packet,
        })
      );
    }

    return true;
  }

  public onPacketReceived(callback: (packet: DashboardTelemetryPacket) => void): void {
    this.listeners.push(callback);
  }

  public onError(callback: (err: Error) => void): void {
    this.errorListeners.push(callback);
  }

  public onDisconnect(callback: (reason?: string) => void): void {
    this.disconnectListeners.push(callback);
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getTransportName(): string {
    return 'Himalayan Wi-Fi Socket (Simulated)';
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.connected) {
        this.stopHeartbeat();
      }
    }, 2000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Developer testing tool: trigger simulated Wi-Fi disconnect/drop
  public simulateConnectionDrop(): void {
    if (this.connected) {
      this.connected = false;
      this.stopHeartbeat();
      this.disconnectListeners.forEach((fn) => fn('Wi-Fi connection dropped unexpectedly'));
    }
  }
}
