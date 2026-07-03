/**
 * Catálogo central de ícones (Font Awesome) usados no sistema.
 *
 * Sempre referencie os ícones por aqui em vez de escrever a classe
 * (ex.: 'fas fa-qrcode') diretamente nos componentes/models. Assim um
 * ícone como "Emitir PIX" ou "Verificar Pagamento" fica padronizado em
 * todas as telas e basta alterar em um único lugar.
 */
export const Icons = {
  pix: {
    emitir: 'fas fa-qrcode',
    exibir: 'fas fa-eye',
    verificarPagamento: 'fas fa-search-dollar',
    semJuros: 'fas fa-percentage',
    compartilhar: 'fas fa-share-alt',
    copiar: 'far fa-copy',
    abrirLink: 'fas fa-external-link-alt',
  },
  loading: 'fas fa-spinner fa-spin',
} as const;
