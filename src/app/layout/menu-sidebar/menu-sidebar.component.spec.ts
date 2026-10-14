import { Routes } from '@angular/router';
import { Subject } from 'rxjs';
import { ApiDaRota } from '../../core/route-flags';
import { MenuItem } from './menu-item.model';
import { MenuSidebarComponent } from './menu-sidebar.component';

class TelaFalsa {}

/** "get /x" -> true: as chaves das respostas tem espaco e barra, fora do camelCase do lint. */
const respostasDe = (...pares: [string, boolean][]): Record<string, boolean> => Object.fromEntries(pares);

describe('MenuSidebarComponent.createMenu', () => {
  const rotas: Routes = [
    { path: 'home', title: 'Inicio', component: TelaFalsa },
    {
      path: 'logistica', title: 'Logística', data: ['role:logistica'], children: [
        { path: 'ordem-carregamento', title: 'Carregamento', data: ['api:get:/carregamento', 'role:logistica'], component: TelaFalsa },
        { path: 'localidades', title: 'Localidades', data: ['api:post:/locais/search', 'role:logistica'], component: TelaFalsa },
      ],
    },
    {
      path: 'cobranca', title: 'Cobrança', data: ['role:cobranca'], children: [
        { path: 'titulos', title: 'Títulos', data: ['api:get:/cobranca/titulos', 'role:cobranca'], component: TelaFalsa },
      ],
    },
    {
      path: 'relatorios', title: 'Relatórios', data: ['role-not:business_partner'], children: [
        { path: 'relatorio', title: 'Relatórios', component: TelaFalsa },
      ],
    },
  ];

  let papeis: string[];
  let ativo: boolean;
  let respostas: Record<string, boolean> | null;

  function menu(): MenuItem[] {
    return criarComponente().createMenu(rotas);
  }

  function criarComponente(): MenuSidebarComponent {
    const auth = {
      hasRole: (r: string) => papeis.includes(r), isLoggedIn: () => true, isCliente: () => false, loginChange$: new Subject(),
    };
    const offline = { offlineEnabled: false, onlineSalesAvailable: true, canEnterOfflineRoutes: false };
    const permissoes = {
      get ativo() { return ativo; },
      changes$: new Subject(),
      permitido: (apis: ApiDaRota[]) => {
        const atuais = respostas;
        if (!atuais || apis.length === 0) {
          return undefined;
        }
        const lidas = apis.map(a => atuais[a.chave]);
        return lidas.some(r => r === true) ? true : (lidas.some(r => r === undefined) ? undefined : false);
      },
    };
    return new MenuSidebarComponent(
      {} as any, {} as any, {} as any, auth as any, offline as any, permissoes as any, {} as any);
  }

  const nomes = (itens: MenuItem[]): string[] =>
    itens.flatMap(it => [it.name, ...it.children.map(c => `${it.name} › ${c.name}`)]);

  beforeEach(() => {
    papeis = ['logistica'];
    ativo = true;
    respostas = null;
  });

  it('flag desligada: menu pelo role, como antes', () => {
    ativo = false;
    respostas = respostasDe(['get /cobranca/titulos', true]);
    expect(nomes(menu())).toEqual([
      'Inicio', 'Logística', 'Logística › Carregamento', 'Logística › Localidades', 'Relatórios', 'Relatórios › Relatórios',
    ]);
  });

  it('com resposta, a api decide e o grupo segue os filhos, ignorando o proprio role', () => {
    respostas = respostasDe(['get /carregamento', false], ['post /locais/search', true], ['get /cobranca/titulos', true]);
    expect(nomes(menu())).toEqual([
      'Inicio', 'Logística', 'Logística › Localidades', 'Cobrança', 'Cobrança › Títulos', 'Relatórios', 'Relatórios › Relatórios',
    ]);
  });

  it('grupo sem nenhum filho visivel some', () => {
    respostas = respostasDe(['get /carregamento', false], ['post /locais/search', false], ['get /cobranca/titulos', false]);
    const itens = menu();
    expect(nomes(itens)).toEqual(['Inicio', 'Relatórios', 'Relatórios › Relatórios']);
    expect(itens.every(it => it.hasChildren === it.children.length > 0)).toBeTrue();
  });

  it('flag desligada: grupo vazio continua como antes', () => {
    ativo = false;
    papeis = ['logistica'];
    const rotasComGrupoVazio: Routes = [
      { path: 'grupo', title: 'Grupo', data: ['role:logistica'], children: [
        { path: 'filho', title: 'Filho', data: ['role:cobranca'], component: TelaFalsa },
      ] },
    ];
    const itens = criarComponente().createMenu(rotasComGrupoVazio);
    expect(nomes(itens)).toEqual(['Grupo']);
    expect(itens[0].hasChildren).toBeTrue();
  });

  it('sem resposta cai no role (backend fora, primeiro acesso)', () => {
    respostas = null;
    expect(nomes(menu())).toEqual([
      'Inicio', 'Logística', 'Logística › Carregamento', 'Logística › Localidades', 'Relatórios', 'Relatórios › Relatórios',
    ]);
  });

  it('role-not esconde mesmo com a flag ligada', () => {
    papeis = ['business_partner'];
    respostas = respostasDe(['get /carregamento', true], ['post /locais/search', true], ['get /cobranca/titulos', true]);
    expect(nomes(menu())).not.toContain('Relatórios');
  });
});
