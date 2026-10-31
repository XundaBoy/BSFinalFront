
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// =====================================
// MODELO DE SAÍDA
// =====================================

export interface Saida {
  id: number;
  nomeSaida: string;
  valor: number;
  dataHora: string;
}

// =====================================
// DADOS PARA CADASTRAR E EDITAR
// =====================================

export interface SaidaPayload {
  nomeSaida: string;
  valor: number;
}

// =====================================
// SERVICE DE SAÍDAS
// =====================================

@Injectable({
  providedIn: 'root'
})
export class SaidasService {

  private http = inject(HttpClient);

  // ENDEREÇO DO BACKEND
  private readonly API = 'http://localhost:8080/api/saidas';

  // =====================================
  // LISTAR TODAS AS SAÍDAS
  // =====================================

  findAll(): Observable<Saida[]> {
    return this.http.get<Saida[]>(
      `${this.API}/findAll`
    );
  }

  // =====================================
  // CADASTRAR SAÍDA
  // =====================================

  save(saida: SaidaPayload): Observable<string> {
    return this.http.post(
      `${this.API}/save`,
      saida,
      { responseType: 'text' }
    );
  }

  // =====================================
  // EDITAR SAÍDA
  // =====================================

  updateById(
    id: number,
    saida: SaidaPayload
  ): Observable<string> {

    return this.http.put(
      `${this.API}/updateById/${id}`,
      saida,
      { responseType: 'text' }
    );
  }

  // =====================================
  // EXCLUIR SAÍDA
  // =====================================

  deleteById(id: number): Observable<string> {
    return this.http.delete(
      `${this.API}/deleteById/${id}`,
      { responseType: 'text' }
    );
  }
}
