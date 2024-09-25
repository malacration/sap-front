import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  roles = {
    admin: [{ url: '/**', actions: ['*'] }],
    vendedor: [
      { url: '/contrato-venda-futura', actions: ['*'] },
      { url: 'branch', actions: ['get'] },
      { url: '/business-partners/search', actions: ['*'] },
      { url: 'item/search/branch/**', actions: ['*'] },
      { url: 'prazo/tabela/**', actions: ['get'] },
      { url: '/quotation/angular/**', actions: ['post'] },
      { url: '/condicao/**', actions: ['get'] },
      { url: '/forma-pagamento/filial/*/cardcode/*', actions: ['get'] },
    ],
    vendedor_admin: [
      { url: '/sales-person/search', actions: ['*'] },
      { url: '/sales-person/*/business-partners', actions: ['*'] },
      { url: '/sales-person/replace/*/por/*', actions: ['*'] },
      { url: '/forma-pagamento/filial/*/cardcode/*', actions: ['get'] },
    ],
  };

  private rolesSubject = new BehaviorSubject(this.roles);
  roles$ = this.rolesSubject.asObservable();

  constructor() {}

  updateRole(role: string, permissions: any): void {
    this.roles[role] = permissions;
    this.rolesSubject.next(this.roles);
  }

  removeRole(role: string): void {
    delete this.roles[role];  
    this.rolesSubject.next(this.roles);  
  }
}