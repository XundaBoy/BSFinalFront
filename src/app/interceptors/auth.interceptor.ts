
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';


export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);

  const ehApiBackend =
   req.url.startsWith(`${environment.apiUrl}/`)

  const ehLogin =
    req.url === `${environment.apiUrl}/auth/login`

  if (!ehApiBackend || ehLogin) {
    return next(req);
  }

  const token = authService.getToken();

  if (!token) {
    return next(req);
  }

  const requisicaoAutenticada = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(requisicaoAutenticada);
};
