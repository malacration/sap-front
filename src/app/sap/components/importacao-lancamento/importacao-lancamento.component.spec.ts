import { of, throwError } from 'rxjs';
import { ImportacaoLancamentoComponent } from './importacao-lancamento.component';
import {
  ImportacaoLancamentoService, LinhaLancamento, PreviaImportacaoLancamento
} from '../../service/importacao-lancamento.service';
import { AlertService } from '../../../shared/service/alert.service';

describe('ImportacaoLancamentoComponent', () => {
  let service: jasmine.SpyObj<ImportacaoLancamentoService>;
  let alert: jasmine.SpyObj<AlertService>;
  let component: ImportacaoLancamentoComponent;
  const arquivo = new File(['x'], 'outubro.csv');

  const linha = (numero: number, erros: string[] = [], avisos: string[] = []): LinhaLancamento => ({
    linha: numero, filial: 1, data: '2026-10-05', contaDebito: 'D', contaCredito: 'C', valor: 10,
    historico: 'H', grupoEconomico: null, centroCusto: null, referencia: null, referencia2: null, referencia3: null,
    erros, avisos, lancamentoIgual: null, numeroLancamentoIgual: null, nomeContaDebito: null, nomeContaCredito: null,
  });
  const previa = (extra: Partial<PreviaImportacaoLancamento> = {}): PreviaImportacaoLancamento => ({
    arquivo: 'outubro.csv', hash: 'h1', codificacao: 'UTF-8', linhas: [linha(2), linha(3, [], ['aviso'])],
    erros: [], importacoesAnteriores: [], totalLinhas: 2, totalValor: 20, linhasComErro: 0, linhasComAviso: 1,
    linhasJaNoSap: 0, podeImportar: true, exigeConfirmacao: false,
    resumoPorConta: [
      { conta: 'C', nome: 'Caixa', debito: 0, credito: 20, saldo: -20, linhas: 2 },
      { conta: 'D', nome: 'Despesa', debito: 20, credito: 0, saldo: 20, linhas: 2 },
    ], ...extra,
  });

  async function validarCom(p: PreviaImportacaoLancamento) {
    service.validar.and.returnValue(of(p));
    component.selecionarArquivo({ target: { files: [arquivo] } } as any);
    await component.validar();
  }

  beforeEach(() => {
    service = jasmine.createSpyObj('ImportacaoLancamentoService', ['validar', 'importar', 'historico']);
    alert = jasmine.createSpyObj('AlertService', ['confirm']);
    alert.confirm.and.resolveTo({ isConfirmed: true } as any);
    service.importar.and.returnValue(of({
      id: 'X', status: 'IMPORTADO', lancamentos: [101, 102], mensagem: 'ok',
      porLinha: [{ linha: 2, transacao: 101, numero: 700101 }, { linha: 3, transacao: 102, numero: 700102 }],
    }));
    component = new ImportacaoLancamentoComponent(service, alert);
  });

  it('prévia limpa libera a importação e mostra todas as linhas', async () => {
    await validarCom(previa());
    expect(component.podeImportar).toBeTrue();
    expect(component.soProblemas).toBeFalse();
    expect(component.linhasVisiveis.length).toBe(2);
  });

  it('prévia com erro não importa e já abre só as linhas com problema', async () => {
    await validarCom(previa({ linhas: [linha(2), linha(3, ['erro'])], linhasComErro: 1, podeImportar: false }));
    expect(component.podeImportar).toBeFalse();
    expect(component.linhasVisiveis.map(l => l.linha)).toEqual([3]);
    await component.importar();
    expect(service.importar).not.toHaveBeenCalled();
  });

  it('arquivo já importado só entra marcando a reimportação', async () => {
    await validarCom(previa({
      importacoesAnteriores: [{ id: 'A', usuario: 'Beltrano', data: '2026-10-01', hora: '09:00' }], exigeConfirmacao: true,
    }));
    expect(component.podeImportar).toBeFalse();
    component.reimportar = true;
    await component.importar();
    expect(service.importar).toHaveBeenCalledOnceWith(arquivo, 'h1', true);
  });

  it('linhas que já existem no SAP também exigem a confirmação', async () => {
    // Arquivo importado pelo curl antigo: sem registro no histórico, mas os lançamentos estão no SAP.
    await validarCom(previa({ linhasJaNoSap: 2, exigeConfirmacao: true }));
    expect(component.podeImportar).toBeFalse();
    await component.importar();
    expect(service.importar).not.toHaveBeenCalled();
    component.reimportar = true;
    await component.importar();
    expect(service.importar).toHaveBeenCalledOnceWith(arquivo, 'h1', true);
  });

  it('resumo por conta fecha débito com crédito e volta para a primeira página', async () => {
    await validarCom(previa());
    component.pagina = 3;
    component.mostrar('contas');
    expect(component.visao).toBe('contas');
    expect(component.pagina).toBe(1);
    expect(component.totalDebito).toBe(20);
    expect(component.totalCredito).toBe(20);
    expect(component.saldo(20)).toContain('20,00 D');
    expect(component.saldo(-20)).toContain('20,00 C');
    // soma de ponto flutuante que deveria fechar em zero não vira "0,00 C"
    expect(component.saldo(0.1 + 0.2 - 0.3)).not.toMatch(/ [DC]$/);
  });

  it('depois de importar mostra a tabela inteira para ver o número gerado de cada linha', async () => {
    await validarCom(previa());
    component.soProblemas = true;
    component.mostrar('contas');
    await component.importar();
    expect(component.soProblemas).toBeFalse();
    expect(component.visao).toBe('linhas');
    expect(component.gerados.size).toBe(2);
  });

  it('histórico mostra a faixa de números gerados e abre o detalhe por linha', async () => {
    const h = {
      id: 'A', usuario: 'Fulano', data: '2026-10-06', hora: '15:00', arquivo: 'a.csv', linhas: 3, total: 30, forcado: false,
      lancamentos: [
        { linha: 2, transacao: 1499716, numero: 793887 },
        { linha: 3, transacao: 1499715, numero: 793886 },
        { linha: 4, transacao: 1499720, numero: 793891 },
      ],
    };
    service.historico.and.returnValue(of([h]));
    await component.abrirHistorico();
    expect(component.faixaGerada(h)).toBe('nº 793886 a 793891');
    expect(component.faixaGerada({ ...h, lancamentos: [h.lancamentos[0]] })).toBe('nº 793887');
    expect(component.faixaGerada({ ...h, lancamentos: [] })).toBe('');
    // histórico antigo (só transação) ou número faltando em algum: a faixa é de transações
    const antigo = { ...h, lancamentos: [{ linha: 0, transacao: 101, numero: null }, { linha: 0, transacao: 105, numero: null }] };
    expect(component.faixaGerada(antigo)).toBe('transação 101 a 105');
    const misto = { ...h, lancamentos: [h.lancamentos[0], { linha: 5, transacao: 1499730, numero: null }] };
    expect(component.faixaGerada(misto)).toBe('transação 1499716 a 1499730');
    component.alternarDetalhe(h);
    expect(component.historicoAberto).toBe('A');
    component.alternarDetalhe(h);
    expect(component.historicoAberto).toBeNull();
  });

  it('cancelar a confirmação não envia nada', async () => {
    await validarCom(previa());
    alert.confirm.and.resolveTo({ isConfirmed: false } as any);
    await component.importar();
    expect(service.importar).not.toHaveBeenCalled();
  });

  it('depois de importar não deixa importar de novo', async () => {
    await validarCom(previa());
    await component.importar();
    await component.importar();
    expect(service.importar).toHaveBeenCalledTimes(1);
    expect(component.resultado.lancamentos).toEqual([101, 102]);
    expect(component.podeImportar).toBeFalse();
    expect(component.gerados.get(3)).toEqual({ linha: 3, transacao: 102, numero: 700102 });
  });

  it('falha na importação exige validar de novo e mostra a prévia devolvida', async () => {
    await validarCom(previa());
    const devolvida = previa({ linhas: [linha(2, ['Filial 9 não existe'])], linhasComErro: 1, podeImportar: false });
    service.importar.and.returnValue(throwError(() => ({ status: 422, error: { mensagem: 'O arquivo tem erros.', previa: devolvida } })));
    await component.importar();
    expect(component.erro).toBe('O arquivo tem erros.');
    expect(component.previa).toBe(devolvida);
    expect(component.exigeNovaValidacao).toBeTrue();
    expect(component.podeImportar).toBeFalse();

    await validarCom(previa());
    expect(component.exigeNovaValidacao).toBeFalse();
    expect(component.podeImportar).toBeTrue();
  });

  it('sem resposta do servidor avisa que a importação pode ter entrado', async () => {
    await validarCom(previa());
    service.importar.and.returnValue(throwError(() => ({ status: 0, error: new ProgressEvent('error') })));
    await component.importar();
    expect(component.erro).toContain('pode ter entrado');
    expect(component.podeImportar).toBeFalse();
  });

  it('libera escolher de novo o mesmo arquivo e ignora o diálogo cancelado', async () => {
    const input = { files: [arquivo], value: 'C:\\fakepath\\outubro.csv' };
    component.selecionarArquivo({ target: input } as any);
    expect(component.arquivo).toBe(arquivo);
    expect(input.value).toBe('');
    component.selecionarArquivo({ target: { files: [], value: '' } } as any);
    expect(component.arquivo).toBe(arquivo);
  });

  it('recusa com resposta diz que nada foi gravado; sem resposta diz que pode ter entrado', async () => {
    await validarCom(previa());
    service.importar.and.returnValue(throwError(() => ({ status: 403, error: 'Acesso negado' })));
    await component.importar();
    expect(component.erro).toBe('Acesso negado');

    await validarCom(previa());
    service.importar.and.returnValue(throwError(() => ({ status: 400, error: null })));
    await component.importar();
    expect(component.erro).toContain('Nenhum lançamento foi gravado');

    await validarCom(previa());
    service.importar.and.returnValue(throwError(() => ({ status: 504, error: null })));
    await component.importar();
    expect(component.erro).toContain('pode ter entrado');
  });

  it('falha ao carregar o histórico não aparece como histórico vazio', async () => {
    service.historico.and.returnValue(throwError(() => ({ status: 502, error: { mensagem: 'SL fora' } })));
    await component.abrirHistorico();
    expect(component.erroHistorico).toBe('SL fora');
    service.historico.and.returnValue(of([]));
    await component.abrirHistorico();
    expect(component.erroHistorico).toBe('');
  });

  it('trocar de arquivo descarta a prévia anterior', async () => {
    await validarCom(previa());
    component.selecionarArquivo({ target: { files: [new File(['y'], 'novembro.csv')] } } as any);
    expect(component.previa).toBeNull();
    expect(component.podeImportar).toBeFalse();
  });
});
