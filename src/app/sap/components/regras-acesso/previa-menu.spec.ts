import { Route } from '@angular/router';
import { consultasDasRotas, previaDoMenu } from './previa-menu';

class Tela {}

const rotas: Route[] = [
  {
    path: 'venda', title: 'Venda', data: ['role:vendedor', 'role:cobranca'],
    children: [
      { path: 'contratos', title: 'Contratos', component: Tela,
        data: ['role:vendedor', 'role:cobranca', 'api:get:/contrato-venda-futura', 'usa:get:/branch', 'usa:get:/contrato-venda-futura/*'] },
      { path: 'vender', title: 'Vender', component: Tela, data: ['role:vendedor', 'api:post:/quotation/angular'] },
    ],
  },
  { path: 'escondida', title: 'Escondida', component: Tela, data: ['hidden', 'api:get:/x'] },
  { path: 'cliente', title: 'Cliente', component: Tela, data: ['role-not:controladoria', 'api:get:/contrato-venda-futura'] },
];

describe('previaDoMenu', () => {
  const respostas = {
    'get /contrato-venda-futura': true,
    'get /branch': true,
    'get /contrato-venda-futura/*': false,
    'post /quotation/angular': false,
  };

  it('com a flag, a api: decide, o grupo segue os filhos e a usa: negada vira aviso', () => {
    const menu = previaDoMenu(rotas, { perfis: ['controladoria'], respostas, menuPorPermissao: true, modoOperacao: 'external' });

    expect(menu.map(i => i.titulo)).toEqual(['Venda']);
    expect(menu[0].filhos.map(i => i.titulo)).toEqual(['Contratos']);
    expect(menu[0].filhos[0].faltando).toEqual(['GET /contrato-venda-futura/*']);
  });

  it('sem a flag vale o nome do perfil, e a chamada principal negada também entra no aviso', () => {
    const menu = previaDoMenu(rotas, { perfis: ['vendedor'], respostas, menuPorPermissao: false, modoOperacao: 'external' });

    const filhos = menu.find(i => i.titulo === 'Venda')!.filhos;
    expect(filhos.map(i => i.titulo)).toEqual(['Contratos', 'Vender']);
    expect(filhos[1].peloNome).toBeTrue();
    expect(filhos[1].faltando).toEqual(['POST /quotation/angular']);
  });

  it('permissao so de tela (/tela/...) nao aparece como chamada que da 403', () => {
    const soTela: Route[] = [{ path: 'pix', title: 'PIX', component: Tela, data: ['role:pix', 'api:get:/tela/financeiro/pix', 'usa:post:/pix/gerar-chave'] }];
    const menu = previaDoMenu(soTela, { perfis: ['pix'], respostas: {}, menuPorPermissao: false, modoOperacao: 'external' });

    expect(menu[0].faltando).toEqual(['POST /pix/gerar-chave']);
  });

  it('consultasDasRotas junta api: e usa: sem repetir', () => {
    expect(consultasDasRotas(rotas).map(a => a.chave).sort()).toEqual([
      'get /branch', 'get /contrato-venda-futura', 'get /contrato-venda-futura/*', 'get /x', 'post /quotation/angular',
    ]);
  });
});
