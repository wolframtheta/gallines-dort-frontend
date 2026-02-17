import { Injectable } from '@angular/core';

/**
 * Legacy service - groups removed. Kept for compatibility with AuthService.logout.
 */
@Injectable({ providedIn: 'root' })
export class GroupContextService {
  clear(): void {
    // No-op
  }
}
