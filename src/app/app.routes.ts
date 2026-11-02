import { Routes } from '@angular/router';
import { LoginComponent } from './components/layout/login/login.component';
import { PrincipalComponent } from './components/layout/principal/principal.component';
import { EntradaslistComponent } from './components/entradas/entradaslist/entradaslist.component';
import { EntradasdetailsComponent } from './components/entradas/entradasdetails/entradasdetails.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { SaidaslistComponent } from './components/saidas/saidaslist/saidaslist.component';
import { SaidasdetailsComponent } from './components/saidas/saidasdetails/saidasdetails.component';
import { ExtratolistComponent } from './components/extrato/extratolist/extratolist.component';
import { PagarComponent } from './components/pagar/pagar.component';
import { ReceberComponent } from './components/receber/receber.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'otc', component: PrincipalComponent,
    children: [
      { path: 'inicio', component: InicioComponent },
      { path: 'entradas', component: EntradaslistComponent },
      { path: 'entradas/new', component: EntradasdetailsComponent },
      { path: 'entradas/edit/:id', component: EntradasdetailsComponent },
      { path: 'saidas', component: SaidaslistComponent },
      { path: 'saidas/new', component: SaidasdetailsComponent },
      { path: 'saidas/edit/:id', component: SaidasdetailsComponent },
      { path: 'pagar', component: PagarComponent },
      { path: 'receber', component: ReceberComponent },
      { path: 'extrato', component: ExtratolistComponent }
    ]
  }
];
