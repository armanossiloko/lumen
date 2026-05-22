import { Injectable } from '@angular/core';

const STORAGE_KEY = 'lumen.authToken';

@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  get(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  set(token: string) {
    sessionStorage.setItem(STORAGE_KEY, token);
  }

  clear() {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
