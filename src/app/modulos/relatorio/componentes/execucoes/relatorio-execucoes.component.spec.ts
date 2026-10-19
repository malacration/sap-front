import { fakeAsync, tick } from '@angular/core/testing';
import { HttpResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { Execucao } from '../../modelos/execucao.model';
import { RelatorioExecucoesComponent } from './relatorio-execucoes.component';

function execucao(id: string, status: Execucao['status'], formato: Execucao['formato'] = 'pdf'): Execucao {
  return {
    id, tipo: 'RENDER', relatorioId: 7, relatorioNome: 'Vendas', versao: 1, formato,
    params: { inicio: '2026-01-01' }, status, criadoEm: '2026-10-14T12:00:00Z', iniciadoEm: null,
    concluidoEm: null, expiraEm: null, erro: null,
    arquivo: status === 'CONCLUIDO' ? { nome: `${id}.${formato}`, contentType: 'x', extensao: formato, tamanho: 1 } : null,
  };
}

describe('Minhas execuções', () => {
  function criar(listas: Execucao[][], acompanhadas: string[] = []) {
    let chamada = 0;
    const entregues = new Set<string>();
    const service = {
      execucaoIniciada$: new Subject<Execucao>(),
      listarExecucoes: jasmine.createSpy('listar').and.callFake(() => of(listas[Math.min(chamada++, listas.length - 1)])),
      baixarExecucao: jasmine.createSpy('baixar').and.callFake((id: string) => {
        entregues.add(id);
        return of(new HttpResponse({ body: new Blob(['x']) }));
      }),
      iniciarRender: jasmine.createSpy('iniciarRender').and.returnValue(of(execucao('nova', 'PENDENTE'))),
      iniciarPreview: jasmine.createSpy('iniciarPreview').and.returnValue(of(execucao('nova', 'PENDENTE'))),
      estaSendoAcompanhada: (id: string) => acompanhadas.includes(id),
      foiEntregue: (id: string) => entregues.has(id),
      nomeArquivo: (_: unknown, nome: string) => nome,
      lerErro: () => Promise.resolve(undefined),
    };
    const toastr = jasmine.createSpyObj('ToastrService', ['success', 'error', 'info']);
    const component = new RelatorioExecucoesComponent(service as any, toastr);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    spyOn(HTMLAnchorElement.prototype, 'click');
    return { component, service, toastr };
  }

  it('apos recarregar, baixa sozinho o PDF que estava em andamento quando terminar', fakeAsync(() => {
    const { component, service } = criar([[execucao('a', 'EXECUTANDO')], [execucao('a', 'CONCLUIDO')]]);
    component.ngOnInit();
    expect(service.baixarExecucao).not.toHaveBeenCalled();

    tick(2000);

    expect(service.baixarExecucao).toHaveBeenCalledWith('a');
    component.ngOnDestroy();
  }));

  it('nao baixa sozinho o que ja estava pronto ao abrir a pagina - so marca como novo', fakeAsync(() => {
    const { component, service } = criar([[execucao('a', 'CONCLUIDO')]]);
    component.ngOnInit();
    tick(5000);

    expect(service.baixarExecucao).not.toHaveBeenCalled();
    expect(component.nova(component.execucoes[0])).toBeTrue();
    component.ngOnDestroy();
  }));

  it('nao entrega o que a tela que pediu ainda esta esperando', fakeAsync(() => {
    const { component, service } = criar([[execucao('a', 'PENDENTE')], [execucao('a', 'CONCLUIDO')]], ['a']);
    component.ngOnInit();
    tick(2000);

    expect(service.baixarExecucao).not.toHaveBeenCalled();
    component.ngOnDestroy();
  }));

  it('HTML pronto nao abre aba sozinho - avisa para clicar em Abrir', fakeAsync(() => {
    const { component, service, toastr } = criar([[execucao('a', 'EXECUTANDO', 'html')], [execucao('a', 'CONCLUIDO', 'html')]]);
    component.ngOnInit();
    tick(2000);

    expect(service.baixarExecucao).not.toHaveBeenCalled();
    expect(toastr.success).toHaveBeenCalled();
    component.ngOnDestroy();
  }));

  it('para de consultar quando nada mais esta em andamento', fakeAsync(() => {
    const { component, service } = criar([[execucao('a', 'EXECUTANDO')], [execucao('a', 'CONCLUIDO')]]);
    component.ngOnInit();
    tick(2000);
    const chamadas = service.listarExecucoes.calls.count();

    tick(10000);

    expect(service.listarExecucoes.calls.count()).toBe(chamadas);
    component.ngOnDestroy();
  }));

  it('gerar novamente reaproveita os parametros e o tipo da execucao excluida', () => {
    const { component, service } = criar([[]]);
    component.gerarNovamente(execucao('a', 'EXCLUIDO'));
    expect(service.iniciarRender).toHaveBeenCalledWith(7, 'pdf', { params: { inicio: '2026-01-01' } });

    component.gerarNovamente({ ...execucao('b', 'EXCLUIDO', 'html'), tipo: 'PREVIEW', versao: 3 });
    expect(service.iniciarPreview).toHaveBeenCalledWith(7, 'html', { params: { inicio: '2026-01-01' } }, 3);
  });
});
