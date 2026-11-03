import { formatarTelefone } from './telefone';

describe('formatarTelefone', () => {
  it('formata celular com DDD, fixo com DDD e numeros sem DDD', () => {
    expect(formatarTelefone('69984215478')).toBe('(69) 98421-5478');
    expect(formatarTelefone('6932221234')).toBe('(69) 3222-1234');
    expect(formatarTelefone('984161384')).toBe('98416-1384');
    expect(formatarTelefone('32221234')).toBe('3222-1234');
  });

  it('tira mascara, espacos e o 55 do pais', () => {
    expect(formatarTelefone(' (69) 98421-5478 ')).toBe('(69) 98421-5478');
    expect(formatarTelefone('+55 69 98421-5478')).toBe('(69) 98421-5478');
  });

  it('vazio vira vazio e formato desconhecido fica como veio', () => {
    expect(formatarTelefone(null)).toBe('');
    expect(formatarTelefone('  ')).toBe('');
    expect(formatarTelefone('ramal 204')).toBe('ramal 204');
  });
});
