import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, AuthResponse } from './api.service';
import { GroupContextService } from './group-context.service';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const USER_KEY = 'user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly groupCtx = inject(GroupContextService);

  private accessToken = signal<string | null>(
    (() => {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    })()
  );
  private refreshToken = signal<string | null>(
    (() => {
      try {
        return localStorage.getItem(REFRESH_KEY);
      } catch {
        return null;
      }
    })()
  );
  private user = signal<AuthResponse['user'] | null>(
    (() => {
      try {
        const s = localStorage.getItem(USER_KEY);
        return s ? JSON.parse(s) : null;
      } catch {
        return null;
      }
    })()
  );

  isAuthenticated = computed(() => !!this.accessToken());
  user$ = this.user.asReadonly();

  async login(email: string, password: string) {
    const res = await this.api.login(email, password).toPromise();
    if (!res) throw new Error('Login failed');
    this.setTokens(res);
    return res;
  }

  async register(
    email: string,
    password: string,
    displayName?: string
  ) {
    const res = await this.api
      .register(email, password, displayName)
      .toPromise();
    if (!res) throw new Error('Registration failed');
    this.setTokens(res);
    return res;
  }

  async logout() {
    this.groupCtx.clear();
    const rt = this.refreshToken();
    this.clearTokens();
    this.router.navigate(['/login']);

    if (rt) {
      try {
        await this.api.logout(rt).toPromise();
      } catch {
        /* ignore */
      }
    }
  }

  async refreshTokens(): Promise<string | null> {
    const rt = this.refreshToken();
    if (!rt) return null;
    try {
      const res = await this.api.refresh(rt).toPromise();
      if (res) {
        this.setTokens(res);
        return res.accessToken;
      }
    } catch {
      this.clearTokens();
    }
    return null;
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  private setTokens(res: AuthResponse) {
    this.accessToken.set(res.accessToken);
    this.refreshToken.set(res.refreshToken);
    this.user.set(res.user);
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  }

  private clearTokens() {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.user.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
