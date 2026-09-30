/** Titulo do grupo dos relatorios que nao declaram `pasta`. */
export const SEM_PASTA = 'Sem pasta';

/** O que a busca e o agrupamento precisam saber de um relatorio. */
export interface RelatorioPastavel {
  nome: string;
  descricao?: string | null;
  pasta?: string | null;
}

export interface GrupoDePasta<T> {
  /** Identifica o grupo (sem acento e sem caixa); vazio para "Sem pasta". */
  chave: string;
  titulo: string;
  itens: T[];
}

const ORDEM = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

/** Minuscula e sem acento: "Cobrança" e "cobranca" passam a ser o mesmo texto. */
export function normalizarBusca(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Cada palavra do termo precisa aparecer em nome, descricao ou pasta - incluindo o titulo
 * "Sem pasta" dos relatorios sem pasta - em qualquer ordem, entao "vendas cliente" acha "Vendas por cliente". Termo vazio devolve tudo.
 */
export function filtrarRelatorios<T extends RelatorioPastavel>(lista: T[], termo: string): T[] {
  const palavras = normalizarBusca(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) {
    return lista;
  }
  return lista.filter((item) => {
    // Casa com o titulo que a tela mostra: quem busca "sem pasta" espera achar esse grupo.
    const pasta = chaveDaPasta(item.pasta) === '' ? SEM_PASTA : item.pasta;
    const texto = normalizarBusca(`${item.nome} ${item.descricao ?? ''} ${pasta}`);
    return palavras.every((palavra) => texto.includes(palavra));
  });
}

export function chaveDaPasta(pasta: string | null | undefined): string {
  const chave = normalizarBusca(pasta);
  // Uma pasta chamada "Sem pasta" cairia num grupo homonimo do de verdade.
  return chave === normalizarBusca(SEM_PASTA) ? '' : chave;
}

/** Grupos por nome, com "Sem pasta" sempre por ultimo; itens de cada grupo por nome. */
export function agruparPorPasta<T extends RelatorioPastavel>(lista: T[]): GrupoDePasta<T>[] {
  const grupos = new Map<string, GrupoDePasta<T>>();
  for (const item of lista) {
    const chave = chaveDaPasta(item.pasta);
    let grupo = grupos.get(chave);
    if (!grupo) {
      grupo = { chave, titulo: chave ? (item.pasta ?? '').trim() : SEM_PASTA, itens: [] };
      grupos.set(chave, grupo);
    }
    grupo.itens.push(item);
  }
  const ordenados = [...grupos.values()].sort((a, b) => {
    if (a.chave === '' || b.chave === '') {
      return a.chave === '' ? 1 : -1;
    }
    return ORDEM.compare(a.titulo, b.titulo);
  });
  ordenados.forEach((grupo) => grupo.itens.sort((a, b) => ORDEM.compare(a.nome, b.nome)));
  return ordenados;
}
