
export interface ItemRelatorio {
  codigo: string;
  produto: string;
  embalagem: string; 
  grupo: string;     
  precoBase: number; 
  
  preco30dd: number;
  preco60dd: number;
  preco90dd: number;
}

export interface GrupoRelatorio {
  nomeGrupo: string; 
  itens: ItemRelatorio[];
}