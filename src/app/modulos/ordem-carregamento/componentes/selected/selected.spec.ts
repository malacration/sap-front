import { Subject, of, throwError } from 'rxjs';
import { OrdemCarregamentoSelectedComponent } from './selected';
import { BusinessPartner } from '../../../../sap/model/business-partner/business-partner';

describe('OrdemCarregamentoSelectedComponent - transportadora', () => {

  function parceiro(cardCode: string, cardName: string): BusinessPartner {
    return Object.assign(new BusinessPartner(), { CardCode: cardCode, CardName: cardName });
  }

  // Ordem aberta e sem notas (ordemAberta = true). So os services que a transportadora usa.
  function novo(bpService: any) {
    const alert = { error: jasmine.createSpy('error') };
    const c = new OrdemCarregamentoSelectedComponent(alert as any, null as any, bpService, null as any,
      null as any, null as any, null as any, null as any, null as any, null as any);
    c.selected = { DocEntry: 1, U_Status: 'Aberto', U_transportadora: 'FOR0001' } as any;
    return { c, alert };
  }

  it('ao abrir a ordem carrega a transportadora gravada', () => {
    const { c } = novo({ get: () => of(parceiro('FOR0001', 'TRANSPORTES X')) });
    (c as any).carregarTransportadora('FOR0001');
    expect(c.businessPartner?.CardName).toBe('TRANSPORTES X');
  });

  it('antes do SAP responder ja guarda o codigo, para salvar nao gravar nulo', () => {
    const resposta = new Subject<BusinessPartner>();
    const { c } = novo({ get: () => resposta });
    (c as any).carregarTransportadora('FOR0001');
    expect(c.businessPartner?.CardCode).toBe('FOR0001');
  });

  it('ordem sem transportadora limpa a da ordem aberta antes', () => {
    const { c } = novo({ get: () => of(parceiro('FOR0001', 'TRANSPORTES X')) });
    c.businessPartner = parceiro('FOR0009', 'DA ORDEM ANTERIOR');
    (c as any).carregarTransportadora(null);
    expect(c.businessPartner).toBeNull();
  });

  it('resposta que chega depois de trocar de ordem e descartada', () => {
    const resposta = new Subject<BusinessPartner>();
    const { c } = novo({ get: () => resposta });
    c.selectBp(parceiro('FOR0001', 'TRANSPORTES X'));
    // Abrir outra ordem (sem transportadora) passa pelo hydrate, que chama carregarTransportadora.
    c.selected = { DocEntry: 2, U_Status: 'Aberto' } as any;
    (c as any).carregarTransportadora(undefined);
    resposta.next(parceiro('FOR0001', 'TRANSPORTES X'));
    expect(c.businessPartner).toBeNull();
  });

  it('a gravada que chega depois de o usuario limpar o campo nao volta', () => {
    const resposta = new Subject<BusinessPartner>();
    const { c } = novo({ get: () => resposta });
    (c as any).carregarTransportadora('FOR0001');
    c.selectBp(undefined);
    resposta.next(parceiro('FOR0001', 'TRANSPORTES X'));
    expect(c.businessPartner).toBeNull();
  });

  it('a escolhida vale na hora, mesmo se o GET do cadastro falhar', () => {
    const { c, alert } = novo({ get: () => throwError(() => new Error('SAP fora')) });
    c.selectBp(parceiro('FOR0002', 'TRANSPORTES Y'));
    expect(c.businessPartner?.CardCode).toBe('FOR0002');
    // O ErrorInterceptor ja avisa a falha HTTP; um alerta aqui seria o segundo.
    expect(alert.error).not.toHaveBeenCalled();
  });

  it('o botao de limpar (undefined) zera a transportadora sem erro', () => {
    const { c } = novo({ get: () => of(parceiro('FOR0001', 'TRANSPORTES X')) });
    c.businessPartner = parceiro('FOR0001', 'TRANSPORTES X');
    expect(() => c.selectBp(undefined)).not.toThrow();
    expect(c.businessPartner).toBeNull();
  });
});
