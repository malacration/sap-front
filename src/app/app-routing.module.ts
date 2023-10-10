import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PageNotFoundComponent } from './shared/components';

import { HomeComponent } from './home/home.component';
import { RomaneioComponent } from './sap/components/romaneio/romaneio.component';
import { EntradaInsumoComponent } from './sap/components/entrada-insumo/entrada-insumo.component';
import { CadastroComponent } from './sap/components/cadastro/cadastro.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: HomeComponent
  },
  {
    path: 'romaneio',
    component: RomaneioComponent
  },
  {
    path: 'entrada-insumo/:id',
    component: EntradaInsumoComponent
  },
  {
    path: 'cadastro',
    component: CadastroComponent
  },
  {
    path: '**',
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
