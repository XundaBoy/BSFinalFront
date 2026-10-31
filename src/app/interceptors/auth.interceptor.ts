
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);

  const ehApiBackend =
    req.url.startsWith('http://localhost:8080/api/');

  const ehLogin =
    req.url === 'http://localhost:8080/api/auth/login';

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
