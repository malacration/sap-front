/** Titulo do grupo dos relatorios que nao declaram `pasta`. */
export const SEM_PASTA = 'Sem pasta';

/** O que a busca e o agrupamento precisam saber de um relatorio. */
export interface RelatorioPastavel {
  nome: string;
  descricao?: string | null;
  pasta?: string | null;
}

/** Separador dos niveis no campo `pasta`: `Financeiro/Contas a pagar`. */
export const SEPARADOR_PASTA = '/';

/** Uma pasta da arvore. Um relatorio mora na pasta do ULTIMO nivel do caminho dele. */
export interface GrupoDePasta<T> {
  /** Caminho inteiro, sem acento e sem caixa ("financeiro/contas a pagar"); vazio para "Sem pasta". */
  chave: string;
  /** So o nome deste nivel ("Contas a pagar"). */
  titulo: string;
  /** Nomes do caminho ate aqui (["Financeiro", "Contas a pagar"]). */
  caminho: string[];
  /** 0 na raiz, 1 dentro de uma pasta... */
  nivel: number;
  /** Relatorios que estao DIRETAMENTE nesta pasta. */
  itens: T[];
  /** Pastas dentro desta. */
  filhos: GrupoDePasta<T>[];
  /** Relatorios nesta pasta e em todas as de dentro. */
  total: number;
}

/** Pedaco de um texto, marcado quando casou com a busca. */
export interface Trecho {
  texto: string;
  marcado: boolean;
}

const ORDEM = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
const COMBINANTES = /[̀-ͯ]/g;
const LETRA_OU_NUMERO = /[\p{L}\p{N}]/u;
const MARCA_COMBINANTE = /\p{M}/u;

/** Menor e melhor: acerto no nome vale mais que na pasta, e na pasta mais que na descricao. */
const PESO_NOME = 0;
const PESO_PASTA = 1;
const PESO_DESCRICAO = 2;
/** Nome que comeca exatamente pelo que foi digitado passa na frente dos demais acertos no nome. */
const BONUS_NOME_COMECA = 0.5;
const FRASE_SEM_PASTA = 'sem pasta';
/** "sem p" ja conta como quem esta digitando "sem pasta"; "sem" sozinho, nao. */
const MINIMO_FRASE_SEM_PASTA = 5;

/**
 * Normaliza UM caractere (minuscula, sem acento). E a unica regra de normalizacao: a busca e o
 * destaque a usam juntos, entao nunca discordam (normalizar a string inteira, em vez de caractere
 * a caractere, mudaria, por exemplo, o sigma final grego e faria o destaque errar o trecho).
 */
function normalizarCaractere(caractere: string): string {
  // O sigma final (ς) e o sigma comum (σ) sao a mesma letra: caractere a caractere nao ha como saber
  // qual o contexto pedia, entao os dois viram um so e "ΟΣ" continua achavel por "ος".
  return caractere.normalize('NFD').replace(COMBINANTES, '').toLowerCase().replace(/ς/g, 'σ');
}

/** Minuscula e sem acento: "Cobrança" e "cobranca" passam a ser o mesmo texto. */
export function normalizarBusca(texto: string | null | undefined): string {
  return Array.from(texto ?? '').map(normalizarCaractere).join('').trim();
}

function palavrasDaBusca(termo: string): string[] {
  return normalizarBusca(termo).split(/\s+/).filter(Boolean);
}

/** `origem[i]` e o indice (em caracteres do texto original) que gerou o caractere `i` do texto normalizado. */
interface TextoNormalizado {
  texto: string;
  origem: number[];
}

/** Normaliza como [normalizarBusca], sem o trim, guardando de onde veio cada caractere (para destacar). */
function normalizarComOrigem(original: string): TextoNormalizado {
  let texto = '';
  const origem: number[] = [];
  Array.from(original).forEach((caractere, indice) => {
    const normalizado = normalizarCaractere(caractere);
    texto += normalizado;
    for (let i = 0; i < normalizado.length; i++) {
      origem.push(indice);
    }
  });
  return { texto, origem };
}

/** Caractere (ponto de codigo) imediatamente antes de `posicao`, inteiro mesmo se for par substituto. */
function caractereAntes(texto: string, posicao: number): string {
  const baixo = texto.charCodeAt(posicao - 1);
  const alto = posicao >= 2 ? texto.charCodeAt(posicao - 2) : 0;
  const ehPar = baixo >= 0xdc00 && baixo <= 0xdfff && alto >= 0xd800 && alto <= 0xdbff;
  return texto.slice(ehPar ? posicao - 2 : posicao - 1, posicao);
}

/** Posicoes em que uma palavra do texto COMECA com `palavra` ("ar" nao casa com o meio de "Pagar"). */
function inicios(texto: string, palavra: string): number[] {
  const achadas: number[] = [];
  let de = 0;
  for (;;) {
    const posicao = texto.indexOf(palavra, de);
    if (posicao < 0) {
      return achadas;
    }
    if (posicao === 0 || !LETRA_OU_NUMERO.test(caractereAntes(texto, posicao))) {
      achadas.push(posicao);
    }
    de = posicao + 1;
  }
}

function fraseEhSemPasta(frase: string): boolean {
  return frase.length >= MINIMO_FRASE_SEM_PASTA && FRASE_SEM_PASTA.startsWith(frase);
}

/** Menor peso entre os campos em que a palavra comeca alguma palavra; `null` se nao casa em nenhum. */
function melhorPeso(palavra: string, campos: [number, string][]): number | null {
  let melhor: number | null = null;
  for (const [peso, texto] of campos) {
    if (inicios(texto, palavra).length > 0 && (melhor === null || peso < melhor)) {
      melhor = peso;
    }
  }
  return melhor;
}

function pontuar(item: RelatorioPastavel, palavras: string[], frase: string): number | null {
  const semPasta = chaveDaPasta(item.pasta) === '';
  const nome = normalizarBusca(item.nome);
  // "Sem pasta" so e tratado como texto quando a busca e a frase inteira (ou o comeco dela):
  // senao "sem" e "pasta" casariam com todo relatorio sem pasta.
  if (semPasta && fraseEhSemPasta(frase)) {
    return nome.startsWith(frase) ? PESO_PASTA - BONUS_NOME_COMECA : PESO_PASTA;
  }
  const campos: [number, string][] = [
    [PESO_NOME, nome],
    [PESO_PASTA, semPasta ? '' : normalizarBusca(item.pasta)],
    [PESO_DESCRICAO, normalizarBusca(item.descricao)],
  ];
  let total = 0;
  for (const palavra of palavras) {
    const peso = melhorPeso(palavra, campos);
    if (peso === null) {
      return null;
    }
    total += peso;
  }
  return nome.startsWith(frase) ? total - BONUS_NOME_COMECA : total;
}

/**
 * Cada palavra digitada precisa COMECAR alguma palavra do nome, da descricao ou da pasta (em
 * qualquer ordem), entao "vend cli" acha "Vendas por cliente" mas "gar" nao acha "Pagar".
 * Termo vazio devolve a propria lista; com termo, o resultado vem por relevancia (nome antes de
 * pasta antes de descricao; empate, por nome).
 */
export function filtrarRelatorios<T extends RelatorioPastavel>(lista: T[], termo: string): T[] {
  const palavras = palavrasDaBusca(termo);
  if (palavras.length === 0) {
    return lista;
  }
  const frase = palavras.join(' ');
  return lista
    .map((item, posicao) => ({ item, posicao, pontos: pontuar(item, palavras, frase) }))
    .filter((r): r is { item: T; posicao: number; pontos: number } => r.pontos !== null)
    .sort((a, b) => a.pontos - b.pontos || ORDEM.compare(a.item.nome, b.item.nome) || a.posicao - b.posicao)
    .map((r) => r.item);
}

/** Niveis do caminho, sem espacos e sem niveis vazios: " A / B " vira ["A", "B"]. */
export function niveisDaPasta(pasta: string | null | undefined): string[] {
  return (pasta ?? '').split(SEPARADOR_PASTA).map((nivel) => nivel.trim()).filter((nivel) => nivel !== '');
}

/**
 * Chave de cada pasta do caminho, da raiz ate a ultima: "Financeiro/Contas" -> ["financeiro",
 * "financeiro/contas"]. Sem pasta -> [""] (o grupo virtual "Sem pasta").
 */
export function chavesDoCaminho(pasta: string | null | undefined): string[] {
  const niveis = niveisDaPasta(pasta).map(normalizarBusca);
  if (niveis.length === 0) {
    return [''];
  }
  const chaves = niveis.map((_, i) => niveis.slice(0, i + 1).join(SEPARADOR_PASTA));
  // Uma pasta de raiz chamada "Sem pasta" e o proprio grupo virtual (chave vazia): senao a tela
  // mostraria duas raizes com o mesmo titulo. As subpastas dela seguem com a chave do caminho.
  if (niveis[0] === normalizarBusca(SEM_PASTA)) {
    chaves[0] = '';
  }
  return chaves;
}

/** Chave da pasta onde o relatorio mora (a do ultimo nivel). */
export function chaveDaPasta(pasta: string | null | undefined): string {
  const chaves = chavesDoCaminho(pasta);
  return chaves[chaves.length - 1];
}

/** Todas as pastas da arvore, em profundidade (pai antes dos filhos). */
export function todosOsNos<T>(nos: GrupoDePasta<T>[]): GrupoDePasta<T>[] {
  return nos.flatMap((no) => [no, ...todosOsNos(no.filhos)]);
}

/**
 * Monta a arvore de pastas. Por padrao, pastas e itens vao por nome, com "Sem pasta" por ultimo.
 * Com `porRelevancia` (lista ja ordenada por [filtrarRelatorios]), cada nivel e cada item mantem
 * a ordem de chegada - a pasta do melhor acerto fica em cima - e so "Sem pasta" vai para o fim.
 */
export function agruparPorPasta<T extends RelatorioPastavel>(lista: T[], porRelevancia = false): GrupoDePasta<T>[] {
  const raizes: GrupoDePasta<T>[] = [];
  const porChave = new Map<string, GrupoDePasta<T>>();
  const criar = (chave: string, caminho: string[], pai?: GrupoDePasta<T>) => {
    const grupo: GrupoDePasta<T> = {
      chave, titulo: caminho[caminho.length - 1], caminho, nivel: caminho.length - 1, itens: [], filhos: [], total: 0,
    };
    porChave.set(chave, grupo);
    (pai ? pai.filhos : raizes).push(grupo);
    return grupo;
  };

  for (const item of lista) {
    const chaves = chavesDoCaminho(item.pasta);
    const niveis = niveisDaPasta(item.pasta);
    let pai: GrupoDePasta<T> | undefined;
    chaves.forEach((chave, i) => {
      // A raiz virtual sempre se chama "Sem pasta", como quer que o relatorio a tenha escrito.
      const titulo = chave === '' ? SEM_PASTA : niveis[i];
      pai = porChave.get(chave) ?? criar(chave, [...(pai?.caminho ?? []), titulo], pai);
    });
    pai!.itens.push(item);
  }

  const fechar = (nos: GrupoDePasta<T>[]) => {
    for (const no of nos) {
      fechar(no.filhos);
      no.total = no.itens.length + no.filhos.reduce((soma, filho) => soma + filho.total, 0);
    }
  };
  const ordenar = (nos: GrupoDePasta<T>[]) => {
    if (porRelevancia) {
      return;
    }
    nos.sort((a, b) => ORDEM.compare(a.titulo, b.titulo));
    nos.forEach((no) => {
      no.itens.sort((a, b) => ORDEM.compare(a.nome, b.nome));
      ordenar(no.filhos);
    });
  };
  fechar(raizes);
  ordenar(raizes);
  // "Sem pasta" e sempre o ultimo; o resto mantem a ordem (sort estavel).
  return raizes.sort((a, b) => (a.chave === '' ? 1 : 0) - (b.chave === '' ? 1 : 0));
}

/**
 * Divide `texto` em trechos, marcando onde as palavras digitadas comecam uma palavra do texto.
 * A comparacao ignora acento e caixa, mas os trechos devolvidos vem do texto original.
 */
export function destacar(texto: string | null | undefined, termo: string): Trecho[] {
  const original = texto ?? '';
  const palavras = palavrasDaBusca(termo);
  if (original === '' || palavras.length === 0) {
    return [{ texto: original, marcado: false }];
  }
  const { texto: normalizado, origem } = normalizarComOrigem(original);
  const caracteres = Array.from(original);
  const marcados = new Array<boolean>(caracteres.length).fill(false);
  for (const palavra of palavras) {
    for (const inicio of inicios(normalizado, palavra)) {
      for (let i = inicio; i < inicio + palavra.length; i++) {
        marcados[origem[i]] = true;
      }
    }
  }
  // Texto decomposto (letra + acento separados): o acento nao tem caractere proprio no texto
  // normalizado, entao acompanha a marca da letra anterior em vez de partir o destaque.
  caracteres.forEach((caractere, i) => {
    if (i > 0 && marcados[i - 1] && MARCA_COMBINANTE.test(caractere)) {
      marcados[i] = true;
    }
  });
  const trechos: Trecho[] = [];
  caracteres.forEach((caractere, i) => {
    const ultimo = trechos[trechos.length - 1];
    if (ultimo && ultimo.marcado === marcados[i]) {
      ultimo.texto += caractere;
    } else {
      trechos.push({ texto: caractere, marcado: marcados[i] });
    }
  });
  return trechos;
}
