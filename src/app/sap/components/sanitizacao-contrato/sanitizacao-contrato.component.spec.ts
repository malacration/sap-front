import { of, throwError } from 'rxjs';
import { SanitizacaoContratoComponent } from './sanitizacao-contrato.component';
import { SanitizacaoContratoService, ReclassificacaoSanitizacao } from '../../service/sanitizacao-contrato.service';
import { AlertService } from '../../../shared/service/alert.service';

describe('SanitizacaoContratoComponent', () => {
  let service: jasmine.SpyObj<SanitizacaoContratoService>;
  let alert: jasmine.SpyObj<AlertService>;
  let component: SanitizacaoContratoComponent;
  const item = (id: number, apta = true): ReclassificacaoSanitizacao => ({
    transId: id, contrato: 10, filial: 1, cliente: 'C1', nomeCliente: 'Cliente',
    nota: { docEntry: 20, docNum: 30, valor: 100 }, situacaoNota: 'Cancelada',
    devolucoes: [], pernas: [], apropriacoes: [], reconciliacoes: [],
    impedimentos: apta ? [] : ['Devolução parcial'], acoes: ['Estornar'], podeAplicar: apta,
  });

  beforeEach(() => {
    service = jasmine.createSpyObj('SanitizacaoContratoService', ['previa', 'aplicar']);
    alert = jasmine.createSpyObj('AlertService', ['confirm']);
    component = new SanitizacaoContratoComponent(service, alert);
    service.previa.and.returnValue(of({ id: 'token', data: '2026-09-24', itens: [item(1), item(2, false), item(3)] }));
    service.aplicar.and.callFake((_token, id) => of({ transId: id, status: 'APLICADO', mensagem: 'ok', cancelamentos: [] }));
    alert.confirm.and.resolveTo({ isConfirmed: true } as any);
  });

  it('prévia não lança e devolução parcial não pode ser selecionada', async () => {
    await component.verificar();
    component.selecionarVisiveis();
    expect([...component.selecionados]).toEqual([1, 3]);
    expect(service.aplicar).not.toHaveBeenCalled();
  });

  it('cancelar confirmação não envia lançamentos', async () => {
    await component.verificar();
    component.selecionarVisiveis();
    alert.confirm.and.resolveTo({ isConfirmed: false } as any);
    await component.aplicar();
    expect(service.aplicar).not.toHaveBeenCalled();
  });

  it('envia somente itens selecionados e impede repetição', async () => {
    await component.verificar();
    component.selecionar(component.previa.itens[0], true);
    await component.aplicar();
    await component.aplicar();
    expect(service.aplicar).toHaveBeenCalledOnceWith('token', 1);
    expect(component.resultados[1].status).toBe('APLICADO');
  });

  it('mudança no SAP interrompe lote e exige nova prévia', async () => {
    await component.verificar();
    component.selecionarVisiveis();
    service.aplicar.and.returnValue(of({ transId: 1, status: 'REJEITADO', mensagem: 'Dados alterados', cancelamentos: [] }));
    await component.aplicar();
    component.selecionarVisiveis();
    expect(service.aplicar.calls.count()).toBe(1);
    expect(component.exigeNovaPrevia).toBeTrue();
    expect(component.selecionados.size).toBe(0);
  });

  it('timeout não repete escrita nem continua o lote', async () => {
    await component.verificar();
    component.selecionarVisiveis();
    service.aplicar.and.returnValue(throwError(() => new Error('timeout')));
    await component.aplicar();
    expect(service.aplicar.calls.count()).toBe(1);
    expect(component.resultados[1].status).toBe('CONFERIR');
    expect(component.exigeNovaPrevia).toBeTrue();
  });

  it('sair da tela durante confirmação não inicia lançamentos', async () => {
    await component.verificar();
    component.selecionarVisiveis();
    component.ngOnDestroy();
    await component.aplicar();
    expect(service.aplicar).not.toHaveBeenCalled();
  });
});
