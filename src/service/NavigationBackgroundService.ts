/**
 * NavigationBackgroundService
 * 
 * Manages background execution, screen-off handling, wake lock,
 * persistent notifications, and battery optimization for motorcycle rides.
 * 
 * In Android: Corresponds to a Location Foreground Service (FOREGROUND_SERVICE_TYPE_LOCATION)
 * with a persistent high-priority notification and WakeLock management.
 */

import { NavigationState } from '../types/navigation';
import { navigationEngine } from '../navigation/NavigationEngine';
import { dashboardManager } from '../dashboard/DashboardConnectionManager';

export class NavigationBackgroundService {
  private wakeLock: any = null;
  private isScreenOffSimulated = false;
  private isWakeLockActive = false;
  private screenOffListeners: ((isOff: boolean) => void)[] = [];
  private notificationSupported = false;

  constructor() {
    this.checkNotificationSupport();
  }

  private checkNotificationSupport(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationSupported = true;
    }
  }

  /**
   * Request Notification permission for Lockscreen Turn-by-Turn notifications
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (!this.notificationSupported) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Acquires WakeLock to keep screen on if the phone is mounted on the handlebar.
   * If the rider turns screen OFF, WakeLock is cleanly released to conserve battery.
   */
  public async setWakeLock(enable: boolean): Promise<void> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    try {
      if (enable) {
        if (!this.wakeLock) {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
          this.isWakeLockActive = true;
          this.wakeLock.addEventListener('release', () => {
            this.isWakeLockActive = false;
            this.wakeLock = null;
          });
        }
      } else {
        if (this.wakeLock) {
          await this.wakeLock.release();
          this.wakeLock = null;
          this.isWakeLockActive = false;
        }
      }
    } catch (err) {
      console.warn('WakeLock error:', err);
    }
  }

  /**
   * Pocket Mode / Simulated Screen OFF:
   * Rider turns off screen to save battery while riding with phone in pocket.
   * Navigation and Wi-Fi streaming to the Himalayan 450 dashboard remain 100% active.
   */
  public togglePocketScreenOff(): void {
    this.isScreenOffSimulated = !this.isScreenOffSimulated;
    this.screenOffListeners.forEach((fn) => fn(this.isScreenOffSimulated));
  }

  public setScreenOffSimulated(isOff: boolean): void {
    this.isScreenOffSimulated = isOff;
    this.screenOffListeners.forEach((fn) => fn(this.isScreenOffSimulated));
  }

  public isScreenOff(): boolean {
    return this.isScreenOffSimulated;
  }

  public onScreenOffChange(callback: (isOff: boolean) => void): () => void {
    this.screenOffListeners.push(callback);
    callback(this.isScreenOffSimulated);
    return () => {
      this.screenOffListeners = this.screenOffListeners.filter((fn) => fn !== callback);
    };
  }

  /**
   * Updates Lock Screen / Background Notification (Android Foreground Service persistent notification)
   */
  public updateBackgroundNotification(state: NavigationState): void {
    if (!state.isNavigating || !this.notificationSupported) return;

    if (Notification.permission === 'granted') {
      const distance = state.distanceToNextManeuver
        ? state.distanceToNextManeuver >= 1000
          ? `${(state.distanceToNextManeuver / 1000).toFixed(1)} km`
          : `${Math.round(state.distanceToNextManeuver)} m`
        : '';

      const title = `${distance} • ${state.nextInstruction || 'Continue straight'}`;
      const body = `Himalayan 450 Connected | ETA ${state.eta || '--:--'} • ${
        state.remainingDistance ? `${(state.remainingDistance / 1000).toFixed(1)} km remaining` : ''
      }`;

      // In Android, this runs as a sticky Notification via NotificationCompat.Builder
      // In Web, we update document title & media session metadata
      if (typeof document !== 'undefined') {
        document.title = `${distance} ${state.nextInstruction} | MotoNav`;
      }

      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${distance} ${state.nextInstruction}`,
          artist: 'Royal Enfield Himalayan 450 Navigation',
          album: `ETA: ${state.eta || '--:--'} on ${state.currentRoad || 'Route'}`,
        });
      }
    }
  }
}

export const navigationBackgroundService = new NavigationBackgroundService();
