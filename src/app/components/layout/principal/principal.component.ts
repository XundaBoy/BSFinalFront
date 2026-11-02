
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MenuComponent } from '../menu/menu.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-principal',
  standalone: true,
  imports: [
    MenuComponent,
    RouterOutlet
  ],
  templateUrl: './principal.component.html',
  styleUrl: './principal.component.scss'
})
export class PrincipalComponent {

  private readonly authService = inject(AuthService);

  // IDENTIFICA O USUARIO AUTENTICADO
  get nomeUsuario(): string {

    const nome = this.authService.getNome();

    return nome?.trim() || 'Usuário';
  }
}
