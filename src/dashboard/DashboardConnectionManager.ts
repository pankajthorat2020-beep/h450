/**
 * DashboardConnectionManager
 * Manages the Wi-Fi lifecycle between smartphone and the Royal Enfield Himalayan 450 cluster.
 * 
 * Handles automatic reconnects, heartbeats, and status notifications.
 * GUARANTEE: Navigation logic never stops even if the dashboard connection fails or disconnects.
 */

import { DashboardConnectionStatus, DashboardTelemetryPacket, NavigationState } from '../types/navigation';
import { DashboardMessageEncoder } from './DashboardMessageEncoder';
import { DashboardTransport, MockHimalayanTransport } from './DashboardTransport';

export class DashboardConnectionManager {
  private status: DashboardConnectionStatus = 'DISCONNECTED';
  private transport: DashboardTransport;
  private encoder: DashboardMessageEncoder;
  private statusListeners: ((status: DashboardConnectionStatus) => void)[] = [];
  private packetListeners: ((packet: DashboardTelemetryPacket) => void)[] = [];
  private lastError: string | null = null;

  // Wi-Fi Configuration
  private host: string = '192.168.4.1';
  private port: number = 8088;
  private pairingPin: string = '450450'; // Default Himalayan 450 pairing PIN

  // Reconnection state
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: any = null;
  private shouldAutoReconnect = true;

  constructor(transport?: DashboardTransport) {
    this.encoder = new DashboardMessageEncoder();
    this.transport = transport || new MockHimalayanTransport();
    this.setupTransportListeners();
  }

  private setupTransportListeners(): void {
    this.transport.onError((err) => {
      this.lastError = err.message;
      this.setStatus('ERROR');
      this.handleConnectionLost();
    });

    this.transport.onDisconnect((_reason) => {
      if (this.shouldAutoReconnect && this.status === 'CONNECTED') {
        this.setStatus('RECONNECTING');
        this.handleConnectionLost();
      } else if (this.status !== 'CONNECTING') {
        this.setStatus('DISCONNECTED');
      }
    });

    this.transport.onPacketReceived((packet) => {
      this.packetListeners.forEach((fn) => fn(packet));
    });
  }

  public getStatus(): DashboardConnectionStatus {
    return this.status;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public getPairingPin(): string {
    return this.pairingPin;
  }

  public setPairingPin(pin: string): void {
    this.pairingPin = pin;
  }

  public onStatusChange(callback: (status: DashboardConnectionStatus) => void): () => void {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((fn) => fn !== callback);
    };
  }

  public onTelemetryUpdate(callback: (packet: DashboardTelemetryPacket) => void): () => void {
    this.packetListeners.push(callback);
    return () => {
      this.packetListeners = this.packetListeners.filter((fn) => fn !== callback);
    };
  }

  private setStatus(status: DashboardConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach((fn) => fn(status));
    }
  }

  public async connect(): Promise<boolean> {
    if (this.status === 'CONNECTED' || this.status === 'CONNECTING') {
      return true;
    }

    this.setStatus('CONNECTING');
    this.lastError = null;

    try {
      const ok = await this.transport.connect(this.host, this.port, this.pairingPin);
      if (ok) {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
        return true;
      } else {
        throw new Error('Could not establish connection to Himalayan 450');
      }
    } catch (err: any) {
      this.lastError = err.message || 'Connection failed';
      this.setStatus('ERROR');
      if (this.shouldAutoReconnect) {
        this.scheduleReconnect();
      }
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.shouldAutoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.transport.disconnect();
    this.setStatus('DISCONNECTED');
  }

  private handleConnectionLost(): void {
    if (this.shouldAutoReconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('ERROR');
      this.lastError = 'Maximum Himalayan 450 reconnect attempts reached';
      return;
    }

    this.setStatus('RECONNECTING');
    const delay = Math.min(10000, 1500 * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(async () => {
      try {
        const success = await this.transport.connect(this.host, this.port, this.pairingPin);
        if (success) {
          this.reconnectAttempts = 0;
          this.setStatus('CONNECTED');
        } else {
          this.scheduleReconnect();
        }
      } catch (err) {
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Sends the current NavigationState to the motorcycle display.
   * Runs non-blockingly so navigation is never paused.
   */
  public sendNavigationState(state: NavigationState): void {
    const packet = this.encoder.encode(state);
    const rawBytes = this.encoder.encodeToBinary(packet);

    // Broadcast to listeners even in simulated mode
    this.transport.send(packet, rawBytes).catch((err) => {
      console.warn('Dashboard packet transmission dropped:', err);
    });
  }

  public getTransport(): DashboardTransport {
    return this.transport;
  }
}

// Global singleton instance for app-wide lifecycle
export const dashboardManager = new DashboardConnectionManager();
