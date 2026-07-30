import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  Categoria,
  Despesa,
  Habitante,
  Notificacao,
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // Habitantes
  getHabitantes() {
    return this.http
      .get<ApiResponse<Habitante[]>>(`${this.base}/habitantes`)
      .pipe(map((r) => r.data));
  }

  createHabitante(body: Partial<Habitante> & { email?: string; password?: string }) {
    return this.http.post<ApiResponse<Habitante>>(`${this.base}/habitantes`, body).pipe(map((r) => r.data));
  }

  updateHabitante(id: string, body: Partial<Habitante>) {
    return this.http.put<ApiResponse<Habitante>>(`${this.base}/habitantes/${id}`, body).pipe(map((r) => r.data));
  }

  deleteHabitante(id: string) {
    return this.http.delete<ApiResponse<Habitante>>(`${this.base}/habitantes/${id}`).pipe(map((r) => r.data));
  }

  // Categorias
  getCategorias() {
    return this.http
      .get<ApiResponse<Categoria[]>>(`${this.base}/categorias`)
      .pipe(map((r) => r.data));
  }

  createCategoria(body: Partial<Categoria>) {
    return this.http.post<ApiResponse<Categoria>>(`${this.base}/categorias`, body).pipe(map((r) => r.data));
  }

  updateCategoria(id: string, body: Partial<Categoria>) {
    return this.http.put<ApiResponse<Categoria>>(`${this.base}/categorias/${id}`, body).pipe(map((r) => r.data));
  }

  deleteCategoria(id: string) {
    return this.http.delete(`${this.base}/categorias/${id}`);
  }

  // Despesas
  getDespesas(params: Record<string, string | number | undefined>) {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http
      .get<ApiResponse<{ items: Despesa[]; total: number; page: number; pages: number }>>(
        `${this.base}/despesas`,
        { params: httpParams }
      )
      .pipe(map((r) => r.data));
  }

  getDespesa(id: string) {
    return this.http.get<ApiResponse<Despesa>>(`${this.base}/despesas/${id}`).pipe(map((r) => r.data));
  }

  createDespesa(body: unknown) {
    return this.http.post<ApiResponse<Despesa>>(`${this.base}/despesas`, body).pipe(map((r) => r.data));
  }

  updateDespesa(id: string, body: unknown) {
    return this.http.put<ApiResponse<Despesa>>(`${this.base}/despesas/${id}`, body).pipe(map((r) => r.data));
  }

  deleteDespesa(id: string) {
    return this.http.delete<ApiResponse<Despesa>>(`${this.base}/despesas/${id}`).pipe(map((r) => r.data));
  }

  duplicarDespesa(id: string) {
    return this.http
      .post<ApiResponse<Despesa>>(`${this.base}/despesas/${id}/duplicar`, {})
      .pipe(map((r) => r.data));
  }

  registarPagamento(id: string, body: { valor: number; habitanteId?: string }) {
    return this.http
      .post<ApiResponse<Despesa>>(`${this.base}/despesas/${id}/pagamentos`, body)
      .pipe(map((r) => r.data));
  }

  pararRecorrencia(id: string) {
    return this.http
      .post<ApiResponse<Despesa>>(`${this.base}/despesas/${id}/parar-recorrencia`, {})
      .pipe(map((r) => r.data));
  }

  uploadAnexo(id: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ApiResponse<Despesa>>(`${this.base}/despesas/${id}/anexo`, fd).pipe(map((r) => r.data));
  }

  getDashboard(mes?: number, ano?: number) {
    let params = new HttpParams();
    if (mes != null) params = params.set('mes', String(mes));
    if (ano != null) params = params.set('ano', String(ano));
    return this.http
      .get<ApiResponse<Record<string, unknown>>>(`${this.base}/dashboard`, { params })
      .pipe(map((r) => r.data));
  }

  getEstatisticas(ano?: number) {
    const params = ano ? new HttpParams().set('ano', ano) : undefined;
    return this.http
      .get<ApiResponse<Record<string, unknown>>>(`${this.base}/estatisticas`, { params })
      .pipe(map((r) => r.data));
  }

  getAcertos(mes?: number, ano?: number) {
    let params = new HttpParams();
    if (mes) params = params.set('mes', mes);
    if (ano) params = params.set('ano', ano);
    return this.http
      .get<ApiResponse<Record<string, unknown>>>(`${this.base}/acertos`, { params })
      .pipe(map((r) => r.data));
  }

  liquidarAcerto(body: unknown) {
    return this.http.post(`${this.base}/acertos/liquidar`, body);
  }

  getNotificacoes() {
    return this.http
      .get<ApiResponse<Notificacao[]>>(`${this.base}/notificacoes`)
      .pipe(map((r) => r.data));
  }

  marcarLida(id: string) {
    return this.http.patch(`${this.base}/notificacoes/${id}/lida`, {});
  }

  lerTodas() {
    return this.http.post(`${this.base}/notificacoes/ler-todas`, {});
  }

  getConfig() {
    return this.http.get<ApiResponse<{ moeda: string; temaPadrao: string }>>(`${this.base}/configuracoes`).pipe(map((r) => r.data));
  }

  updateConfig(body: { moeda?: string; temaPadrao?: string }) {
    return this.http.put(`${this.base}/configuracoes`, body);
  }

  getAuditoria() {
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/auditoria`).pipe(map((r) => r.data));
  }

  downloadBackup() {
    return this.http.get(`${this.base}/configuracoes/backup`, { responseType: 'blob' });
  }

  relatorioUrl(formato: string, mes?: number, ano?: number) {
    const params = new URLSearchParams({ formato });
    if (mes) params.set('mes', String(mes));
    if (ano) params.set('ano', String(ano));
    return `${this.base}/relatorios/mensal?${params.toString()}`;
  }
}
