import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const PWA_DISMISSED_KEY = 'pwa_install_dismissed';

export type InstallMode = 'native' | 'ios' | 'generic';

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly canInstall = signal(false);
  readonly installMode = signal<InstallMode>('generic');
  readonly dismissed = signal(
    (() => {
      if (!isPlatformBrowser(this.platformId)) return false;
      try {
        return localStorage.getItem(PWA_DISMISSED_KEY) === '1';
      } catch {
        return false;
      }
    })()
  );

  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  constructor() {
    console.log('[PWA] PwaInstallService constructor', { isBrowser: isPlatformBrowser(this.platformId) });
    if (isPlatformBrowser(this.platformId)) {
      this.detectInstallMode();
      console.log('[PWA] installMode:', this.installMode());
      window.addEventListener('beforeinstallprompt', this.handlePrompt.bind(this));
      window.addEventListener('appinstalled', this.handleInstalled.bind(this));
      const w = window as Window & { __deferredPrompt?: Event };
      if (w.__deferredPrompt) {
        console.log('[PWA] Found __deferredPrompt from early script');
        this.deferredPrompt = w.__deferredPrompt as BeforeInstallPromptEvent;
        this.canInstall.set(true);
        this.installMode.set('native');
      }
    }
  }

  private detectInstallMode(): void {
    const ua = navigator.userAgent;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone;
    if (isStandalone) return;

    if (/iPhone|iPad|iPod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream) {
      this.installMode.set('ios');
    } else if (/Android|webOS|Mobile/i.test(ua) || 'ontouchstart' in window) {
      this.installMode.set('generic');
    } else {
      this.installMode.set('generic');
    }
  }

  private handlePrompt(e: Event): void {
    console.log('[PWA] beforeinstallprompt fired');
    e.preventDefault();
    this.deferredPrompt = e as BeforeInstallPromptEvent;
    this.canInstall.set(true);
    this.installMode.set('native');
  }

  private handleInstalled(): void {
    this.canInstall.set(false);
    this.deferredPrompt = null;
  }

  async install(): Promise<boolean> {
    console.log('[PWA] install() called', { hasDeferredPrompt: !!this.deferredPrompt });
    if (!this.deferredPrompt) return false;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log('[PWA] userChoice:', outcome);
    if (outcome === 'accepted') {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      return true;
    }
    return false;
  }

  dismiss(): void {
    this.dismissed.set(true);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(PWA_DISMISSED_KEY, '1');
    }
  }

  readonly showBanner = computed(() => {
    if (!isPlatformBrowser(this.platformId)) return false;
    if (window.matchMedia('(display-mode: standalone)').matches) return false;
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return false;

    const forceShow = new URLSearchParams(location.search).get('showPwa') === '1';
    if (forceShow) return true;

    if (this.dismissed()) return false;

    return this.canInstall() || this.installMode() === 'ios' || this.installMode() === 'generic';
  });
}
