
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export type Perfil = 'ADMIN' | 'VISUALIZADOR';

export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEmSegundos: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:8080/api/auth/login';

  login(email: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.apiUrl, {
      login: email,
      senha: senha
    }).pipe(
      tap((resposta) => {

        const expiracao = Date.now() +
          resposta.expiraEmSegundos * 1000;

        sessionStorage.setItem('bs_token', resposta.token);
        sessionStorage.setItem('bs_nome', resposta.nome);
        sessionStorage.setItem('bs_email', resposta.email);
        sessionStorage.setItem('bs_perfil', resposta.perfil);
        sessionStorage.setItem(
          'bs_expiracao',
          expiracao.toString()
        );

      })
    );
  }

  getToken(): string | null {

    const token = sessionStorage.getItem('bs_token');

    const expiracao = Number(
      sessionStorage.getItem('bs_expiracao')
    );

    if (!token || !expiracao || Date.now() >= expiracao) {
      this.logout();
      return null;
    }

    return token;
  }

  estaAutenticado(): boolean {
    return this.getToken() !== null;
  }

  getPerfil(): Perfil | null {

    if (!this.estaAutenticado()) {
      return null;
    }

    return sessionStorage.getItem('bs_perfil') as Perfil | null;
  }

  getNome(): string | null {

    if (!this.estaAutenticado()) {
      return null;
    }

    return sessionStorage.getItem('bs_nome');
  }

  isAdmin(): boolean {
    return this.getPerfil() === 'ADMIN';
  }

  logout(): void {

    sessionStorage.removeItem('bs_token');
    sessionStorage.removeItem('bs_nome');
    sessionStorage.removeItem('bs_email');
    sessionStorage.removeItem('bs_perfil');
    sessionStorage.removeItem('bs_expiracao');

  }

}
