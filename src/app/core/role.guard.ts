import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../shared/service/auth.service';
import { OfflineContextService } from './offline/offline-context.service';

/**
 * Rota restrita por papel. Le os "role:X" do `data` da rota (que aqui e um array)
 * e libera se o usuario for `admin` (superusuario) ou tiver QUALQUER um dos papeis
 * exigidos. Sem "role:" no data -> libera (opt-in). E conveniencia de navegacao;
 * o backend tambem exige o papel (rules.yml + RoleBasedAuthorizationFilter).
 *
 * Usar junto do authGuard: `canActivate: [authGuard, roleGuard]` (authGuard garante
 * login/estado; roleGuard checa papel). Espelha o adminGuard, mas parametrizado
 * pelos papeis declarados na rota.
 *
 * Offline: sem token valido o AuthService nao retorna papeis. Quando ha sessao
 * offline valida (canEnterOfflineRoutes), usamos os papeis gravados na sessao —
 * senao as rotas de venda offline (que carregam "role:") redirecionariam pra /home.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const offline = inject(OfflineContextService);
  const router = inject(Router);

  // O data das rotas aqui e um array (["icon:...","role:..."]) - fora do padrao do Angular.
  // No snapshot o data pode vir mesclado/spreadado (array virando objeto {0:..,1:..}), o que
  // quebraria .map. Por isso lemos do routeConfig.data (array bruto) e caimos pra Object.values
  // como fallback, cobrindo os dois formatos.
  const raw: unknown = route.routeConfig?.data ?? route.data ?? [];
  const entries: any[] = Array.isArray(raw) ? raw : Object.values(raw as object);
  const exigidas = entries
    .map(it => (it?.toString() ?? ''))
    .filter(it => it.startsWith('role:'))
    .map(it => it.substring('role:'.length));

  if (exigidas.length === 0) {
    return true;
  }

  const papeis = new Set(authService.getRoles());
  if (papeis.size === 0 && offline.canEnterOfflineRoutes) {
    for (const r of offline.snapshot.session?.roles ?? []) {
      papeis.add(r);
    }
  }

  if (papeis.has('admin')) {
    return true;
  }
  if (exigidas.some(r => papeis.has(r))) {
    return true;
  }
  return router.navigate(['/home']);
};
