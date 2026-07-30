import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Casa, User } from '../models/models';

const TOKEN_KEY = 'constantino_token';
const USER_KEY = 'constantino_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<User | null>(this.readUser());
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly casa = signal<Casa | null>(null);

  get isLoggedIn() {
    return !!this.token();
  }

  get hasCasa() {
    return !!this.user()?.casaId;
  }

  registar(payload: { email: string; password: string; nome: string }) {
    return this.http
      .post<ApiResponse<{ user: User; token: string }>>(`${environment.apiUrl}/auth/registar`, payload)
      .pipe(tap((res) => this.persist(res.data.token, res.data.user)));
  }

  login(payload: { email: string; password: string }) {
    return this.http
      .post<ApiResponse<{ user: User; token: string }>>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(tap((res) => this.persist(res.data.token, res.data.user)));
  }

  me() {
    return this.http.get<ApiResponse<User>>(`${environment.apiUrl}/auth/me`).pipe(
      tap((res) => {
        this.user.set(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      })
    );
  }

  criarCasa(payload: { nome: string; morada?: string }) {
    return this.http
      .post<ApiResponse<{ casa: Casa; user: User; token: string }>>(`${environment.apiUrl}/casas`, payload)
      .pipe(
        tap((res) => {
          this.persist(res.data.token, res.data.user);
          this.casa.set(res.data.casa);
        })
      );
  }

  entrarCasa(codigo: string) {
    return this.http
      .post<ApiResponse<{ casa: Casa; user: User; token: string }>>(`${environment.apiUrl}/casas/entrar`, {
        codigo,
      })
      .pipe(
        tap((res) => {
          this.persist(res.data.token, res.data.user);
          this.casa.set(res.data.casa);
        })
      );
  }

  getCasa(): Observable<Casa | null> {
    if (!this.hasCasa) {
      this.casa.set(null);
      return of(null);
    }
    return this.http.get<ApiResponse<Casa>>(`${environment.apiUrl}/casas/atual`).pipe(
      map((r) => r.data),
      tap((c) => this.casa.set(c))
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.user.set(null);
    this.casa.set(null);
    this.router.navigateByUrl('/login');
  }

  private persist(token: string, user: User) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.token.set(token);
    this.user.set(user);
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
