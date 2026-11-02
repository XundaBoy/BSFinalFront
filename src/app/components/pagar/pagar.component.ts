import { Component } from '@angular/core';
import { AgendaComponent } from '../agenda/agenda.component';

@Component({
  selector: 'app-pagar',
  standalone: true,
  imports: [AgendaComponent],
  templateUrl: './pagar.component.html',
  styleUrl: './pagar.component.scss'
})
export class PagarComponent {}
