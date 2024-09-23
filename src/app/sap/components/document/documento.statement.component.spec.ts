import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Item } from '../../model/item';

describe('Item', () => {
  let item: Item;

  beforeEach(() => {
    item = new Item();
  });

  it('desconto 1', () => { 
    let item = new Item();

    item.UnitPrice = 32141.76;
    item.jurosCondicaoPagamento = 0;
    item.quantidade = 3242;
    item.descontoCondicaoPagamento = 11; 

    let precoUnitarioEsperado = item.unitPriceLiquid();
    let resultado = item.totalSemFormatacao();

    expect('28606.17').toBe(precoUnitarioEsperado.toString()); 
    expect('92741203.14').toBe(resultado.toString()); 
});

it('desconto 2', () => { 
  let item = new Item();

  item.UnitPrice = 98754.23;
  item.jurosCondicaoPagamento = 0;
  item.quantidade = 324252;
  item.descontoCondicaoPagamento = 12; 

  let precoUnitarioEsperado = item.unitPriceLiquid();
  let resultado = item.totalSemFormatacao();

  expect('86903.72').toBe(precoUnitarioEsperado.toString()); 
  expect('28178705017.44').toBe(resultado.toString()); 
});

it('juros', () => { 
  let item = new Item();

  item.UnitPrice = 54783.32;
  item.jurosCondicaoPagamento = 8;
  item.quantidade = 75654;
  item.descontoCondicaoPagamento = 0; 

  let precoUnitarioEsperado = item.unitPriceLiquid();
  let resultado = item.totalSemFormatacao();

  expect('59165.99').toBe(precoUnitarioEsperado.toString()); 
  expect('4476143807.46').toBe(resultado.toString()); 
});

it('juros 2', () => { 
  let item = new Item();

  item.UnitPrice = 164.32;
  item.jurosCondicaoPagamento = 11;
  item.quantidade = 101;
  item.descontoCondicaoPagamento = 0; 

  let precoUnitarioEsperado = item.unitPriceLiquid();
  let resultado = item.totalSemFormatacao();

  expect('182.40').toBe(precoUnitarioEsperado.toString()); 
  expect('18422.40').toBe(resultado.toString()); 
});

it('mais o segundo desconto', () => { 
  let item = new Item();

  item.UnitPrice = 162.59;
  item.jurosCondicaoPagamento = 0;
  item.descontoCondicaoPagamento = 11; 
  item.quantidade = 101;
  
  let precoUnitarioEsperado = item.unitPriceLiquid();
  let resultado = item.totalSemFormatacao();

  expect('144.71').toBe(precoUnitarioEsperado.toString()); 
  expect('14615.71').toBe(resultado.toString()); 
});
});