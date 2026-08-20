
export class Option{
    value : string
    description : string

    constructor(value, description){
        this.value = value;
        this.description = description;
    }
}

/**
 * Grupo de opções do modo multiple do app-select: o rótulo vira o nó pai, que é marcável (marca
 * as opções que o grupo oferece) e recolhível.
 */
export class OptionGroup{
    label : string
    options : Array<Option>

    constructor(label, options){
        this.label = label;
        this.options = options;
    }
}
