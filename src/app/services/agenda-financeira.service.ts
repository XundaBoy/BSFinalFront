import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export type TipoAgenda = 'PAGAR' | 'RECEBER';
export type StatusAgenda = 'PENDENTE' | 'CONFIRMADO';
export type MoedaAgenda = 'BRL' | 'PYG' | 'USD';

export interface AgendaFinanceira {
  id: number;
  nome: string;
  valor: number;
  moeda: MoedaAgenda;
  dataHora: string;
  tipo: TipoAgenda;
  status: StatusAgenda;
  // Quando a conta foi efetivamente confirmada pelo botao verde.
  // Registros antigos podem retornar null.
  dataConfirmacao?: string | null;
}

export interface AgendaCadastro {
  nome: string;
  valor: number;
  moeda: MoedaAgenda;
  dataHora: string;
  tipo: TipoAgenda;
}

export type AgendaEdicao = Omit<AgendaCadastro, 'tipo'>;

@Injectable({ providedIn: 'root' })
export class AgendaFinanceiraService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = 'http://localhost:8080/api/agenda';

  private headers(): HttpHeaders {
    const token = this.auth.getToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  listar(tipo: TipoAgenda): Observable<AgendaFinanceira[]> {
    return this.http.get<AgendaFinanceira[]>(this.url, {
      params: { tipo }, headers: this.headers()
    });
  }

  buscarPorId(id: number): Observable<AgendaFinanceira> {
    return this.http.get<AgendaFinanceira>(`${this.url}/${id}`, {
      headers: this.headers()
    });
  }

  cadastrar(dados: AgendaCadastro): Observable<AgendaFinanceira> {
    return this.http.post<AgendaFinanceira>(this.url, dados, {
      headers: this.headers()
    });
  }

  editar(id: number, dados: AgendaEdicao): Observable<AgendaFinanceira> {
    return this.http.put<AgendaFinanceira>(`${this.url}/${id}`, dados, {
      headers: this.headers()
    });
  }

  confirmar(id: number): Observable<AgendaFinanceira> {
    return this.http.patch<AgendaFinanceira>(
      `${this.url}/${id}/confirmar`, {}, { headers: this.headers() }
    );
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`, {
      headers: this.headers()
    });
  }
}
