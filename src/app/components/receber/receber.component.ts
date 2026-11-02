import { Component } from '@angular/core';
import { AgendaComponent } from '../agenda/agenda.component';

@Component({
  selector: 'app-receber',
  standalone: true,
  imports: [AgendaComponent],
  templateUrl: './receber.component.html',
  styleUrl: './receber.component.scss'
})
export class ReceberComponent {}
