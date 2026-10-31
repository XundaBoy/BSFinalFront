
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// =====================================
// MODELO DE ENTRADA
// =====================================

export interface Entrada {
  id: number;
  nomeEntrada: string;
  valor: number;
  dataHora: string;
}

// =====================================
// DADOS PARA CADASTRAR E EDITAR
// =====================================

export interface EntradaPayload {
  nomeEntrada: string;
  valor: number;
}

// =====================================
// SERVICE DE ENTRADAS
// =====================================

@Injectable({
  providedIn: 'root'
})
export class EntradasService {

  private http = inject(HttpClient);

  // ENDEREÇO DO BACKEND
  private readonly API = 'http://localhost:8080/api/entradas';

  // =====================================
  // LISTAR TODAS AS ENTRADAS
  // =====================================

  findAll(): Observable<Entrada[]> {
    return this.http.get<Entrada[]>(
      `${this.API}/findAll`
    );
  }

  // =====================================
  // CADASTRAR ENTRADA
  // =====================================

  save(entrada: EntradaPayload): Observable<string> {
    return this.http.post(
      `${this.API}/save`,
      entrada,
      { responseType: 'text' }
    );
  }

  // =====================================
  // EDITAR ENTRADA
  // =====================================

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

  // =====================================
  // EXCLUIR ENTRADA
  // =====================================

  deleteById(id: number): Observable<string> {
    return this.http.delete(
      `${this.API}/deleteById/${id}`,
      { responseType: 'text' }
    );
  }
}
