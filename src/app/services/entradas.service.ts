
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// MOEDAS DISPONIVEIS
export type Moeda = 'BRL' | 'PYG' | 'USD';

// TIPOS DE COTACAO
export type OrigemCotacao =
  'AUTOMATICA' | 'MANUAL' | 'MIGRACAO';

// DADOS RECEBIDOS DO BACKEND
export interface Entrada {
  id: number;
  nomeEntrada: string;
  dataHora: string;
  valor: number;

  moedaOriginal: Moeda;
  cotacaoPorUsd: number;
  valorUsd: number;
  origemCotacao: OrigemCotacao;
  dataCotacao: string | null;
}

// DADOS ENVIADOS PARA CADASTRAR OU EDITAR
export interface EntradaPayload {
  nomeEntrada: string;
  valor: number;
  moedaOriginal: Moeda;
  origemCotacao: 'AUTOMATICA' | 'MANUAL';
  cotacaoPorUsd?: number;
}

@Injectable({
  providedIn: 'root'
})
export class EntradasService {

  private http = inject(HttpClient);

  private readonly API =
    'http://localhost:8080/api/entradas';

  // LISTAR
  findAll(): Observable<Entrada[]> {
    return this.http.get<Entrada[]>(
      `${this.API}/findAll`
    );
  }

  // CADASTRAR
  save(entrada: EntradaPayload): Observable<string> {
    return this.http.post(
      `${this.API}/save`,
      entrada,
      { responseType: 'text' }
    );
  }

  // EDITAR
  updateById(
    id: number,
    entrada: EntradaPayload
  ): Observable<string> {

    return this.http.put(
      `${this.API}/updateById/${id}`,
      entrada,
      { responseType: 'text' }
    );
  }

  // EXCLUIR
  deleteById(id: number): Observable<string> {
    return this.http.delete(
      `${this.API}/deleteById/${id}`,
      { responseType: 'text' }
    );
  }
}
