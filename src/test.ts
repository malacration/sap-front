// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { registerLocaleData } from '@angular/common';
import { NgModule, provideZoneChangeDetection } from '@angular/core';
import localeBr from '@angular/common/locales/pt';

// AppModule registra isso em produção, mas specs que nao importam AppModule (ex.: testes
// de model puro) nunca carregam esse side-effect - sem isso, qualquer getter que chama
// formatCurrency('pt', ...) lanca NG0701 (locale 'pt' ausente) so no ambiente de teste.
registerLocaleData(localeBr);

// Match the production bootstrap's Zone.js scheduling (Angular 22 defaults to zoneless).
@NgModule({ providers: [provideZoneChangeDetection()] })
class ZoneTestingModule {}

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  [BrowserDynamicTestingModule, ZoneTestingModule],
  platformBrowserDynamicTesting(), {
    teardown: { destroyAfterEach: false }
  }
);
