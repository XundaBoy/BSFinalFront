
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MdbFormsModule } from 'mdb-angular-ui-kit/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MdbFormsModule,
    FormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  usuario: string = '';
  senha: string = '';

  carregando: boolean = false;
  mensagemErro: string = '';

  private router = inject(Router);
  private authService = inject(AuthService);

  logar(): void {

    if (this.carregando) {
      return;
    }

    this.mensagemErro = '';

    if (!this.usuario.trim() || !this.senha) {
      this.mensagemErro = 'Preencha o e-mail e a senha.';
      return;
    }

    this.carregando = true;

    this.authService.login(
      this.usuario.trim(),
      this.senha
    ).subscribe({

      next: () => {
        this.carregando = false;
        this.senha = '';

        this.router.navigate(['/otc/inicio']);
      },

      error: (erro: HttpErrorResponse) => {
        this.carregando = false;

        if (erro.status === 401) {
          this.mensagemErro = 'E-mail ou senha incorretos.';
        } else if (erro.status === 0) {
          this.mensagemErro =
            'Não foi possível conectar ao servidor. Verifique se o backend está ligado.';
        } else {
          this.mensagemErro =
            'Ocorreu um erro ao entrar. Tente novamente.';
        }
      }

    });
  }
}
