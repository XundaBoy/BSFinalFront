
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// =====================================
// MOEDAS DISPONIVEIS
// =====================================

export type Moeda = 'BRL' | 'PYG' | 'USD';

export type OrigemCotacao =
  'AUTOMATICA' | 'MANUAL';

// =====================================
// MODELO DE SAIDA
// =====================================

export interface Saida {
  id: number;
  nomeSaida: string;
  valor: number;
  dataHora: string;

  moedaOriginal: Moeda;
  cotacaoPorUsd: number;
  valorUsd: number;
  origemCotacao: OrigemCotacao;
  dataCotacao: string | null;
}

// =====================================
// DADOS PARA CADASTRAR E EDITAR
// =====================================

export interface SaidaPayload {
  nomeSaida: string;
  valor: number;
  moedaOriginal: Moeda;
  origemCotacao: OrigemCotacao;
  cotacaoPorUsd?: number;
}

// =====================================
// SERVICE DE SAIDAS
// =====================================

@Injectable({
  providedIn: 'root'
})
export class SaidasService {

  private readonly http = inject(HttpClient);

  private readonly API =
    'http://localhost:8080/api/saidas';

  // LISTAR TODAS AS SAIDAS
  findAll(): Observable<Saida[]> {
    return this.http.get<Saida[]>(
      `${this.API}/findAll`
    );
  }

  // CADASTRAR SAIDA
  save(saida: SaidaPayload): Observable<string> {
    return this.http.post(
      `${this.API}/save`,
      saida,
      { responseType: 'text' }
    );
  }

  // EDITAR SAIDA
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

  // EXCLUIR SAIDA
  deleteById(id: number): Observable<string> {
    return this.http.delete(
      `${this.API}/deleteById/${id}`,
      { responseType: 'text' }
    );
  }
}
