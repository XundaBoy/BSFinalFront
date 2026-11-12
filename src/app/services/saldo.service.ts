
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SaldoService {

  private http = inject(HttpClient);

  // ENDEREÇO DA API
  private readonly API = `${environment.apiUrl}/saldo`;

  // CONSULTAR O SALDO NO MYSQL
  consultarSaldo(): Observable<number> {
    return this.http.get<number>(this.API);
  }
}
