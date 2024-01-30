import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PageNotFoundComponent } from './shared/components';

import { HomeComponent } from './home/home.component';
import { RomaneioComponent } from './sap/components/romaneio/romaneio.component';
import { EntradaInsumoComponent } from './sap/components/entrada-insumo/entrada-insumo.component';
import { CadastroComponent } from './sap/components/cadastro/cadastro.component';
import { FaturasComponent } from './sap/components/faturas/faturas.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    title: 'Inicio',
    component: HomeComponent
  },
  {
    path: 'romaneio',
    title: 'Romaneio',
    data: ["hidden"],
    component: RomaneioComponent
  },
  {
    path: 'entrada-insumo/:id',
    title: 'Entrada Insumo',
    data: ["hidden"],
    component: EntradaInsumoComponent
  },
  {
    path: 'faturas',
    title: 'Faturas',
    component: FaturasComponent
  },
  {
    path: 'cadastro/:id',
    title: 'Cadastro',
    data: ["hidden"],
    component: CadastroComponent
  },
  {
    path: '**',
    title: 'Não encontrado',
    data: ["hidden"],
    component: PageNotFoundComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {})
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
