import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';
import * as yaml from 'js-yaml';
import { RelatorioAutoriaComponent } from './relatorio-autoria.component';

describe('Autoria de relatorios', () => {
  let service: any;
  let component: RelatorioAutoriaComponent;
  beforeEach(() => {
    service = jasmine.createSpyObj('RelatorioService', ['preview', 'lerErro']);
    component = new RelatorioAutoriaComponent(
      service, jasmine.createSpyObj('ToastrService', ['warning', 'error', 'success', 'info']),
      {} as any, {} as any,
    );
    component.novo();
  });
  afterEach(() => component.ngOnDestroy());

  it('preserva nomes com dois pontos, aspas, cerquilha e substituicoes de regex', () => {
    const nome = 'Vendas: "A" # $& $1';
    component.nomeRelatorio = nome;
    expect((yaml.load(component.definicaoTexto) as any).nome).toBe(nome);
    expect(component.nomeRelatorio).toBe(nome);
    expect((yaml.load(component.definicaoTexto) as any).consulta.sql).toContain('SELECT');
  });

  const exemplo = {
    id: 'agrupado', nome: 'Agrupado', descricao: null,
    definicao: 'nome: Agrupado\nagrupar: [VENDEDOR]\n', template: '{{#each grupos}}{{valor}}{{/each}}',
  };

  it('carrega exemplo direto quando o editor nao tem alteracoes', () => {
    component.exemplos = [exemplo];
    component.carregarExemplo('agrupado');
    expect(component.modoNovo).toBeTrue();
    expect(component.definicaoTexto).toBe(exemplo.definicao);
    expect(component.templateTexto).toBe(exemplo.template);
    expect(component.temAlteracoes).toBeFalse();
  });

  it('pede confirmacao antes de descartar alteracoes e sobre relatorio existente', () => {
    component.exemplos = [exemplo];
    component.definicaoTexto += '\n# editado';
    component.carregarExemplo('agrupado');
    expect(component.definicaoTexto).toContain('# editado');
    component.confirmarAcao();
    expect(component.definicaoTexto).toBe(exemplo.definicao);

    component.modoNovo = false;
    component.carregarExemplo('__modelo_basico__');
    expect(component.definicaoTexto).toBe(exemplo.definicao);
    component.confirmarAcao();
    expect(component.modoNovo).toBeTrue();
    expect(component.definicaoTexto).toContain('nome:');
    expect(component.definicaoTexto).not.toBe(exemplo.definicao);
  });

  it('editar o titulo nao remonta o formulario da previa', () => {
    component.definicaoTexto = 'nome: A\nparametros:\n  - nome: dataInicio\n    tipo: date\n';
    const antes = component.parametrosPreview;
    component.nomeRelatorio = 'Outro titulo';
    expect(component.parametrosPreview).toBe(antes);
    component.definicaoTexto += '  - nome: dataFim\n    tipo: date\n';
    expect(component.parametrosPreview).not.toBe(antes);
    expect(component.parametrosPreview.map((p) => p.nome)).toEqual(['dataInicio', 'dataFim']);
  });

  it('campo vazio nao consome a linha seguinte do YAML', () => {
    component.definicaoTexto = 'nome:\nconsulta:\n  sql: SELECT 1\n';
    component.nomeRelatorio = 'Novo nome';
    expect((yaml.load(component.definicaoTexto) as any).consulta.sql).toBe('SELECT 1');
  });

  function prepararPreview() {
    component.selecionado = { id: 1, ultimaVersao: 2, formatos: ['html'] } as any;
    component.previewFormato = 'html';
    component.previewVersao = 1;
    component.versaoPublicacao = 2;
  }

  it('trocar versao cancela previa e nao libera publicacao de versao nao revisada', () => {
    prepararPreview();
    const resposta = new Subject<HttpResponse<Blob>>();
    service.preview.and.returnValue(resposta);
    component.previsualizar();
    component.previewVersao = 2;
    component.invalidarPreview();
    resposta.next(new HttpResponse({ body: new Blob(['antiga']) }));
    expect(resposta.observed).toBeFalse();
    expect(component.podePublicar).toBeFalse();
    expect(component.previsualizando).toBeFalse();
  });

  it('mantem a mensagem de erro da previa', async () => {
    prepararPreview();
    service.preview.and.returnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    service.lerErro.and.resolveTo({ erro: 'resultado_truncado', mensagem: 'Restrinja o periodo.' });
    component.previsualizar();
    await Promise.resolve();
    expect(component.erroPreview).toBe('Restrinja o periodo.');
    expect(component.podePublicar).toBeFalse();
  });
});
