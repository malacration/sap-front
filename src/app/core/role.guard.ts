import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../shared/service/auth.service';
import { OfflineContextService } from './offline/offline-context.service';
import { PermissoesApiService } from './permissoes-api.service';
import { apisDaRota, flagsDaRota } from './route-flags';

/** O guard espera a resposta das permissoes no maximo isto (F5 e login, quando ela ainda nao chegou). */
const ESPERA_PERMISSOES_MS = 4000;

/**
 * Rota restrita por papel. Le os "role:X" do `data` da rota (que aqui e um array)
 * e libera se o usuario for `admin` (superusuario) ou tiver QUALQUER um dos papeis
 * exigidos. Sem "role:" no data -> libera (opt-in). E conveniencia de navegacao;
 * o backend tambem exige o papel (rules.yml + RoleBasedAuthorizationFilter).
 *
 * "role-not:X" e o inverso: libera todo mundo MENOS quem tem o papel X (ex.: Relatorios
 * fica aberto a todos os papeis internos, menos o usuario externo `business_partner`).
 *
 * "api:metodo:/url" (com a flag menuPorPermissao): a rota abre se o backend disser que o usuario
 * pode chamar essa URL (PermissoesApiService), e o "role:" so vale quando nao ha resposta.
 * O "role-not:" vale sempre.
 *
 * Usar junto do authGuard: `canActivate: [authGuard, roleGuard]` (authGuard garante
 * login/estado; roleGuard checa papel). Espelha o adminGuard, mas parametrizado
 * pelos papeis declarados na rota.
 *
 * Offline: sem token valido o AuthService nao retorna papeis. Quando ha sessao
 * offline valida (canEnterOfflineRoutes), usamos os papeis gravados na sessao —
 * senao as rotas de venda offline (que carregam "role:") redirecionariam pra /home.
 */
export const roleGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const offline = inject(OfflineContextService);
  const permissoes = inject(PermissoesApiService);
  const router = inject(Router);
  const negado = () => router.createUrlTree(['/home']);

  // routeConfig.data (array bruto) com fallback para Object.values: ver route-flags.ts.
  const exigidas = flagsDaRota(route, 'role');
  const excluidas = flagsDaRota(route, 'role-not');
  const apis = apisDaRota(route);

  if (exigidas.length === 0 && excluidas.length === 0 && apis.length === 0) {
    return true;
  }

  const papeis = new Set(authService.getRoles());
  if (papeis.size === 0 && offline.canEnterOfflineRoutes) {
    for (const r of offline.snapshot.session?.roles ?? []) {
      papeis.add(r);
    }
  }

  if (excluidas.some(r => papeis.has(r))) {
    return negado();
  }

  if (permissoes.ativo && apis.length > 0) {
    await permissoes.whenReady(ESPERA_PERMISSOES_MS);
    const resposta = permissoes.permitido(apis);
    if (resposta !== undefined) {
      return resposta ? true : negado();
    }
  }

  if (exigidas.length === 0) {
    return true;
  }
  if (papeis.has('admin')) {
    return true;
  }
  if (exigidas.some(r => papeis.has(r))) {
    return true;
  }
  return negado();
};
