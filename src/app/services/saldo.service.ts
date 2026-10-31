
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SaldoService {

  private http = inject(HttpClient);

  // ENDEREÇO DA API
  private readonly API = 'http://localhost:8080/api/saldo';

  // CONSULTAR O SALDO NO MYSQL
  consultarSaldo(): Observable<number> {
    return this.http.get<number>(this.API);
  }
}
