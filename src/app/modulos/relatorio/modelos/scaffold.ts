export const RELATORIO_SCAFFOLD_YAML = `nome: Meu relatório
descricao: Descreva em uma linha o que este relatório responde

# Quem enxerga este relatório na aba Executar
papeis: [admin]

# Cada item vira um campo do formulário.
# Cadastros: filial, vendedor, parceiro_negocio, item, localidade.
# Cadastros e lista aceitam multiplo: true para usar IN (:nome).
# O \`nome\` precisa ser IGUAL ao :nome usado no SQL.
parametros:
  - nome: dataInicio
    tipo: date
    rotulo: Admitidos a partir de
    obrigatorio: true
  - nome: dataFim
    tipo: date
    rotulo: Admitidos até
    obrigatorio: true

consulta:
  # Regras: sempre SELECT, tabela com o schema na frente, sem comentários,
  # e todo valor variável como :parametro.
  sql: >
    SELECT H."empID" AS MATRICULA, H."firstName" AS NOME,
           H."lastName" AS SOBRENOME, H."jobTitle" AS CARGO,
           H."startDate" AS ADMISSAO
    FROM SBOGRUPOROVEMA.OHEM H
    WHERE H."startDate" >= :dataInicio AND H."startDate" <= :dataFim
    ORDER BY H."startDate" DESC
  maxRows: 2000

# \`campo\` é o nome que a consulta devolve (o AS)
colunas:
  - { campo: MATRICULA, titulo: Matrícula, tipo: texto }
  - { campo: NOME,      titulo: Nome,      tipo: texto }
  - { campo: SOBRENOME, titulo: Sobrenome, tipo: texto }
  - { campo: CARGO,     titulo: Cargo,     tipo: texto }
  - { campo: ADMISSAO,  titulo: Admissão,  tipo: data }

formatos: [pdf, html, csv]
`;

export const RELATORIO_SCAFFOLD_TEMPLATE = `<style>
  @page { size: A4; margin: 1.5cm }
  body  { font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #222 }
  h1    { font-size: 18px; margin: 0 0 4px }
  .sub  { color: #666; margin-bottom: 12px }
  table { width: 100%; border-collapse: collapse }
  thead { display: table-header-group }   /* repete o cabeçalho a cada página */
  th    { background: #eee; text-align: left; padding: 6px; border-bottom: 2px solid #ccc }
  td    { padding: 5px 6px; border-bottom: 1px solid #eee }
  .logo { float: right; max-height: 42px; max-width: 160px; margin-left: 12px }
</style>

{{!-- Logo do sistema, enviada na geração; some se não houver. --}}
{{#if meta.logo}}<img class="logo" src="{{meta.logo}}" alt="Logo">{{/if}}
<h1>{{meta.nome}}</h1>
<div class="sub">De {{params.dataInicio}} até {{params.dataFim}}</div>

<table>
  <thead>
    <tr>
      {{#each colunas}}<th>{{titulo}}</th>{{/each}}
    </tr>
  </thead>
  <tbody>
    {{#each linhas}}
    <tr>
      <td>{{MATRICULA}}</td>
      <td>{{NOME}}</td>
      <td>{{SOBRENOME}}</td>
      <td>{{CARGO}}</td>
      <td>{{ADMISSAO}}</td>
    </tr>
    {{else}}
    <tr><td colspan="5">Nenhum registro no período.</td></tr>
    {{/each}}
  </tbody>
</table>
`;
