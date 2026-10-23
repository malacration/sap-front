import { Subject, of, throwError } from 'rxjs';
import { NovoParceiroComponent, separaLogradouro } from './novo-parceiro.component';

describe('NovoParceiroComponent', () => {

  let component: NovoParceiroComponent;
  let enviados: Array<any>;
  let navegou: Array<any>;
  let resposta: () => any;
  let confirmou: boolean;
  let avisos: Array<string>;
  let infos: Array<string>;
  let consultasCep: Array<string>;
  let respostaCep: () => any;

  beforeEach(() => {
    enviados = [];
    navegou = [];
    resposta = () => of({ CardCode: 'CLI0001234', SalesPersonCode: -1 });
    confirmou = true;
    avisos = [];
    infos = [];
    const bpService = { criarNovo: (cliente) => { enviados.push(cliente); return resposta(); } } as any;
    const formas = { liberadas: () => of([{ PayMethCod: 'AVISTA', Description: 'DEPOSITO' }, { PayMethCod: 'CARTAO', Description: 'CARTAO' }]) } as any;
    const cidades = { get: (uf) => of(uf == 'RO'
      ? [{ AbsId: '4852', Name: 'PORTO VELHO', IbgeCode: '1100205' }, { AbsId: '3852', Name: 'Ariquemes', IbgeCode: '1100023' }]
      : [{ AbsId: '9001', Name: 'RIO BRANCO', IbgeCode: '1200401' }]) } as any;
    const estados = { get: () => of([{ Code: 'RO', Name: 'Rondônia' }, { Code: 'AC', Name: 'Acre' }]) } as any;
    consultasCep = [];
    respostaCep = () => of(null);
    const cep = { consulta: (valor) => { consultasCep.push(valor); return respostaCep(); } } as any;
    const alert = {
      info: (msg) => { infos.push(msg); return Promise.resolve(); },
      confirm: (msg) => { avisos.push(msg); return Promise.resolve({ isConfirmed: confirmou }); },
    } as any;
    const router = { navigate: (rota) => { navegou.push(rota); return Promise.resolve(true); } } as any;
    component = new NovoParceiroComponent(bpService, formas, cidades, estados, cep, alert, router);
    component.ngOnInit();
  });

  function preencheEndereco(endereco, rua: string) {
    endereco.tipoLogradouro = 'RUA';
    endereco.cep = '76800-000';
    endereco.rua = rua;
    endereco.numero = '10';
    endereco.bairro = 'centro';
    component.mudaEstado(endereco, 'RO');
    endereco.codigoMunicipio = '4852';
  }

  function preencheValido() {
    component.nome = 'fulano de tal';
    component.cpfCnpj = '123.456.789-09';
    preencheEndereco(component.entrega, 'rua a');
    component.alternaForma({ PayMethCod: 'AVISTA' } as any);
  }

  it('carrega as formas liberadas', () => {
    expect(component.formas.map(it => it.PayMethCod as any)).toEqual(['AVISTA', 'CARTAO']);
  });

  it('nao envia sem os obrigatorios e lista o que falta', () => {
    component.salvar();

    expect(enviados).toEqual([]);
    expect(component.pendencias).toContain('Ao menos uma forma de pagamento');
    expect(component.pendencias).toContain('CPF com 11 dígitos');
  });

  it('CNPJ exige 14 digitos', () => {
    preencheValido();
    component.mudaTipoPessoa(false);
    component.cpfCnpj = '123.456.789-09';

    expect(component.pendencias).toEqual(['CNPJ com 14 dígitos']);
  });

  it('monta o Cliente do backend com codigo e nome do municipio', async () => {
    preencheValido();
    component.alternaForma({ PayMethCod: 'CARTAO' } as any);

    component.salvar();
    await Promise.resolve();

    expect(enviados.length).toBe(1);
    const cliente = enviados[0];
    expect(cliente.nome).toBe('FULANO DE TAL');
    expect(cliente.cpfCnpj).toBe('12345678909');
    expect(cliente.formasPagamento).toEqual(['AVISTA', 'CARTAO']);
    expect(cliente.idVendedor).toBeNull();
    expect(cliente.endereco.codigoMunicipio).toBe('4852');
    expect(cliente.endereco.cidade).toBe('PORTO VELHO');
    expect(cliente.endereco.estado).toBe('RO');
    expect(cliente.enderecoCobranca).toBeNull();
  });

  it('cobranca diferente exige o segundo endereco e vai em enderecoCobranca', async () => {
    preencheValido();
    component.cobrancaIgualEntrega = false;

    component.salvar();
    await Promise.resolve();
    expect(enviados).toEqual([]);
    expect(component.pendencias).toEqual(['Endereço de cobrança completo (CEP com 8 dígitos e tipo de logradouro)']);

    preencheEndereco(component.cobranca, 'av b');
    component.salvar();
    await Promise.resolve();

    expect(enviados.length).toBe(1);
    expect(enviados[0].endereco.rua).toBe('RUA A');
    expect(enviados[0].enderecoCobranca.rua).toBe('AV B');
  });

  it('desmarcar a forma tira ela do envio', () => {
    preencheValido();
    component.alternaForma({ PayMethCod: 'AVISTA' } as any);

    expect(component.pendencias).toEqual(['Ao menos uma forma de pagamento']);
  });

  it('trocar o estado limpa o municipio escolhido', () => {
    preencheValido();
    component.mudaEstado(component.entrega, 'AC');

    expect(component.entrega.codigoMunicipio).toBeNull();
  });

  it('depois de salvar abre o parceiro criado', async () => {
    preencheValido();
    component.salvar();
    await Promise.resolve();
    await Promise.resolve();

    expect(navegou).toEqual([['/clientes/parceiro-negocio', 'CLI0001234']]);
  });

  it('erro do backend (CPF duplicado) libera o botao de novo', async () => {
    resposta = () => throwError(() => new Error('Ja existe o parceiro'));
    preencheValido();

    component.salvar();
    await Promise.resolve();

    expect(component.salvando).toBeFalse();
    expect(navegou).toEqual([]);
  });

  it('sem vendedor avisa antes e so envia se confirmar', async () => {
    preencheValido();
    confirmou = false;

    component.salvar();
    await Promise.resolve();

    expect(avisos).toEqual([NovoParceiroComponent.AVISO_SEM_VENDEDOR]);
    expect(enviados).toEqual([]);
  });

  it('com vendedor escolhido nao pergunta e informa o vendedor gravado', async () => {
    resposta = () => of({ CardCode: 'CLI0001234', SalesPersonCode: 7, SalesEmployeeName: 'JOAO' });
    preencheValido();
    component.selecionaVendedor({ SalesEmployeeCode: 7 } as any);

    component.salvar();
    await Promise.resolve();

    expect(avisos).toEqual([]);
    expect(enviados[0].idVendedor).toBe('7');
    expect(infos).toEqual(['Parceiro CLI0001234 cadastrado para o vendedor JOAO.']);
  });

  it('cadastro sem vendedor informa o -1', async () => {
    preencheValido();

    component.salvar();
    await Promise.resolve();

    expect(infos).toEqual(['Parceiro CLI0001234 cadastrado sem vendedor (-1).']);
  });

  describe('busca de CEP', () => {

    const cepPinheiro = { cep: '76801-000', logradouro: 'Avenida Pinheiro Machado', bairro: 'Centro',
      localidade: 'Porto Velho', uf: 'RO', ibge: '1100205' };

    it('carrega os estados', () => {
      expect(component.estados.map(it => it.Code)).toEqual(['RO', 'AC']);
    });

    it('so consulta ao completar 8 digitos; trocar so a mascara nao repete', () => {
      respostaCep = () => of(cepPinheiro);
      component.cepAlterado(component.entrega, '76801');
      component.cepAlterado(component.entrega, '76801-000');
      component.cepAlterado(component.entrega, '76801000');

      expect(consultasCep).toEqual(['76801000']);
    });

    it('apagar um digito e redigitar o mesmo CEP consulta de novo', () => {
      respostaCep = () => of(cepPinheiro);
      component.cepAlterado(component.entrega, '76801000');
      component.cepAlterado(component.entrega, '7680100');
      component.cepAlterado(component.entrega, '76801000');

      expect(consultasCep).toEqual(['76801000', '76801000']);
    });

    it('trocar por outro CEP consulta o novo', () => {
      respostaCep = () => of(cepPinheiro);
      component.cepAlterado(component.entrega, '76801000');
      component.cepAlterado(component.entrega, '76801001');

      expect(consultasCep).toEqual(['76801000', '76801001']);
    });

    it('a lupa refaz a consulta do mesmo CEP (ex.: depois de uma falha)', () => {
      component.cepAlterado(component.entrega, '76801000');
      expect(component.entrega.avisoCep).toBe('CEP não encontrado: preencha o endereço manualmente.');

      respostaCep = () => of(cepPinheiro);
      component.buscaCepManual(component.entrega);

      expect(consultasCep).toEqual(['76801000', '76801000']);
      expect(component.entrega.rua).toBe('Pinheiro Machado');
      expect(component.entrega.avisoCep).toBeNull();
    });

    it('lupa com CEP incompleto avisa sem consultar', () => {
      component.entrega.cep = '7680';
      component.buscaCepManual(component.entrega);

      expect(consultasCep).toEqual([]);
      expect(component.entrega.avisoCep).toBe('Informe o CEP com 8 dígitos.');
    });

    it('preenche rua, bairro, estado e o municipio pelo codigo IBGE', () => {
      respostaCep = () => of(cepPinheiro);

      component.cepAlterado(component.entrega, '76801-000');

      expect(component.entrega.rua).toBe('Pinheiro Machado');
      expect(component.entrega.tipoLogradouro).toBe('AVENIDA');
      expect(component.entrega.bairro).toBe('Centro');
      expect(component.entrega.estado).toBe('RO');
      expect(component.entrega.codigoMunicipio).toBe('4852');
      expect(component.entrega.avisoCep).toBeNull();
    });

    it('nao mexe no numero nem no complemento', () => {
      respostaCep = () => of(cepPinheiro);
      component.entrega.numero = '123';
      component.entrega.complemento = 'SALA 2';

      component.cepAlterado(component.entrega, '76801000');

      expect(component.entrega.numero).toBe('123');
      expect(component.entrega.complemento).toBe('SALA 2');
    });

    it('CEP nao encontrado avisa e deixa o que ja estava', () => {
      component.entrega.rua = 'RUA DIGITADA';

      component.cepAlterado(component.entrega, '00000000');

      expect(component.entrega.rua).toBe('RUA DIGITADA');
      expect(component.entrega.avisoCep).toBe('CEP não encontrado: preencha o endereço manualmente.');
    });

    it('municipio fora do cadastro do SAP avisa para escolher na mao', () => {
      respostaCep = () => of({ ...cepPinheiro, ibge: '9999999' });

      component.cepAlterado(component.entrega, '76801000');

      expect(component.entrega.codigoMunicipio).toBeNull();
      expect(component.entrega.avisoCep).toBe('Município do CEP não encontrado no cadastro do SAP: selecione manualmente.');
    });

    it('CEP geral da cidade avisa para conferir rua e bairro', () => {
      respostaCep = () => of({ ...cepPinheiro, logradouro: '', bairro: '' });

      component.cepAlterado(component.entrega, '76800000');

      expect(component.entrega.codigoMunicipio).toBe('4852');
      expect(component.entrega.avisoCep).toBe('CEP geral da cidade: confira rua e bairro.');
    });

    it('CEP da cobranca preenche so a cobranca', () => {
      respostaCep = () => of(cepPinheiro);

      component.cepAlterado(component.cobranca, '76801000');

      expect(component.cobranca.rua).toBe('Pinheiro Machado');
      expect(component.entrega.rua).toBe('');
    });
  });

  describe('achados do review', () => {

    const cep = (ibge: string) => ({ cep: '76801-000', logradouro: 'Rua X', bairro: 'Centro', localidade: '', uf: 'RO', ibge });

    it('novo CEP na mesma UF com IBGE fora da lista nao mantem o municipio anterior', () => {
      respostaCep = () => of(cep('1100205'));
      component.cepAlterado(component.entrega, '76801000');
      expect(component.entrega.codigoMunicipio).toBe('4852');

      respostaCep = () => of(cep('9999999'));
      component.cepAlterado(component.entrega, '76801001');

      expect(component.entrega.codigoMunicipio).toBeNull();
      expect(component.entrega.completo).toBeFalse();
    });

    it('editar o CEP durante a consulta descarta a resposta atrasada', () => {
      const atrasada = new Subject<any>();
      respostaCep = () => atrasada.asObservable();
      component.cepAlterado(component.entrega, '76801000');
      component.cepAlterado(component.entrega, '7680100');
      component.entrega.rua = 'DIGITADA';

      atrasada.next(cep('1100205'));

      expect(component.entrega.rua).toBe('DIGITADA');
      expect(component.entrega.buscandoCep).toBeFalse();
    });

    it('trocar o estado na mao durante a consulta descarta a resposta do CEP', () => {
      const atrasada = new Subject<any>();
      respostaCep = () => atrasada.asObservable();
      component.cepAlterado(component.entrega, '76801000');
      component.mudaEstadoManual(component.entrega, 'AC');

      atrasada.next(cep('1100205'));

      expect(component.entrega.estado).toBe('AC');
    });

    it('CEP com menos de 8 digitos nao completa o endereco', () => {
      preencheValido();
      component.entrega.cep = '1';

      expect(component.pendencias).toEqual(['Endereço de entrega completo (CEP com 8 dígitos e tipo de logradouro)']);
    });

    it('trocar PF/PJ limpa RG/IE e data', () => {
      component.ierg = '123';
      component.dtnasc = '1990-01-01';

      component.mudaTipoPessoa(false);

      expect(component.ierg).toBe('');
      expect(component.dtnasc).toBe('');
    });

    it('localidade com codigo nao numerico e recusada com aviso', () => {
      component.selecionaLocalidade({ Code: 'ABC' } as any);

      expect(component.localidade).toBeNull();
      expect(component.avisoLocalidade).toContain('ABC');
      expect(component.payload().localidade).toBeNull();
    });

    it('lista de municipios: RO -> AC -> RO descarta a primeira resposta de RO', () => {
      const respostas: Array<Subject<any>> = [];
      const cidades = { get: () => { const r = new Subject<any>(); respostas.push(r); return r.asObservable(); } } as any;
      const outro = new NovoParceiroComponent({} as any, { liberadas: () => of([]) } as any, cidades,
        { get: () => of([]) } as any, { consulta: () => of(null) } as any, {} as any, {} as any);

      outro.mudaEstadoManual(outro.entrega, 'RO');
      outro.mudaEstadoManual(outro.entrega, 'AC');
      outro.mudaEstadoManual(outro.entrega, 'RO');
      respostas[0].next([{ AbsId: 'VELHO', Name: 'RESPOSTA ANTIGA', IbgeCode: '1' }]);
      respostas[0].error(new Error('antiga'));

      expect(outro.entrega.cidades).toEqual([]);
      expect(outro.entrega.carregandoCidades).toBeTrue();

      respostas[2].next([{ AbsId: '4852', Name: 'PORTO VELHO', IbgeCode: '1100205' }]);
      expect(outro.entrega.cidades.map(it => it.AbsId)).toEqual(['4852']);
      expect(outro.entrega.carregandoCidades).toBeFalse();
    });

    it('CEP vai so com digitos no formato 00000-000', () => {
      preencheValido();
      component.entrega.cep = 'A76801.000 ';

      expect(component.payload().endereco.cep).toBe('76801-000');
    });

    it('limpar o estado descarta a lista de municipios em voo', () => {
      const respostas: Array<Subject<any>> = [];
      const cidades = { get: () => { const r = new Subject<any>(); respostas.push(r); return r.asObservable(); } } as any;
      const outro = new NovoParceiroComponent({} as any, { liberadas: () => of([]) } as any, cidades,
        { get: () => of([]) } as any, { consulta: () => of(null) } as any, {} as any, {} as any);

      outro.mudaEstadoManual(outro.entrega, 'RO');
      outro.mudaEstadoManual(outro.entrega, null);
      respostas[0].next([{ AbsId: '4852', Name: 'PORTO VELHO', IbgeCode: '1100205' }]);

      expect(outro.entrega.cidades).toEqual([]);
      expect(outro.entrega.carregandoCidades).toBeFalse();
    });

    it('localidade numerica vai como numero', () => {
      component.selecionaLocalidade({ Code: '15' } as any);

      expect(component.avisoLocalidade).toBeNull();
      expect(component.payload().localidade).toBe(15);
    });
  });

  describe('tipo de logradouro', () => {

    it('sem tipo o endereco nao esta completo', () => {
      preencheValido();
      component.entrega.tipoLogradouro = null;

      expect(component.pendencias).toEqual(['Endereço de entrega completo (CEP com 8 dígitos e tipo de logradouro)']);
    });

    it('vai em tipoEndereco nos dois enderecos', () => {
      preencheValido();
      component.cobrancaIgualEntrega = false;
      preencheEndereco(component.cobranca, 'b');
      component.cobranca.tipoLogradouro = 'RODOVIA';

      const cliente = component.payload();
      expect(cliente.endereco.tipoEndereco).toBe('RUA');
      expect(cliente.enderecoCobranca.tipoEndereco).toBe('RODOVIA');
    });

    it('separa o tipo do logradouro do ViaCEP, com acento e caixa', () => {
      expect(separaLogradouro('Avenida Pinheiro Machado')).toEqual({ tipo: 'AVENIDA', rua: 'Pinheiro Machado' });
      expect(separaLogradouro('Praça Marechal Rondon')).toEqual({ tipo: 'PRACA', rua: 'Marechal Rondon' });
      expect(separaLogradouro('rua sete de setembro')).toEqual({ tipo: 'RUA', rua: 'sete de setembro' });
    });

    it('logradouro sem tipo conhecido fica inteiro e nao mexe no tipo escolhido', () => {
      expect(separaLogradouro('Quadra 12 Lote 3')).toEqual({ tipo: null, rua: 'Quadra 12 Lote 3' });
      expect(separaLogradouro('Centro')).toEqual({ tipo: null, rua: 'Centro' });

      respostaCep = () => of({ cep: '76801-000', logradouro: 'Quadra 12', bairro: 'Centro', localidade: '', uf: 'RO', ibge: '1100205' });
      component.entrega.tipoLogradouro = 'LINHA';
      component.cepAlterado(component.entrega, '76801000');

      expect(component.entrega.tipoLogradouro).toBe('LINHA');
      expect(component.entrega.rua).toBe('Quadra 12');
    });
  });
});
