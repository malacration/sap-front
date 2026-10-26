import { Column } from "../../../shared/components/table/column.model"

export class BusinessPartnerDefinition{

    getDefinition() {
        // Texto do cadastro passa por '{{value}}': a tabela renderiza via innerHTML sem sanitizar,
        // e o Handlebars escapa. Texto comum aparece igual; HTML no nome do cliente nao executa.
        return [
            new Column('Id', 'CardCode', '{{value}}'),
            new Column('Nome', 'CardName', '{{value}}'),
            new Column('Doc.', 'CpfCnpjStr', '{{value}}'),
            new Column('Limite Autorizado', 'limiteAutorizadoCurrency'),
            new Column('Limite Disponível', 'limiteDisponivelCurrency')
        ]   
    }
}