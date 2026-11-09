import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { OfflineCatalogService, OfflineCatalogProgress } from '../offline-catalog.service';
import { OfflineContextService } from '../offline-context.service';
import { OfflineRuntimeState } from '../offline.models';
import { AuthService } from '../../../shared/service/auth.service';

@Component({
    selector: 'app-offline-status',
    templateUrl: './offline-status.component.html',
    styleUrls: ['./offline-status.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class OfflineStatusComponent {
  readonly state$: Observable<OfflineRuntimeState> = this.context.state$;
  readonly progress$: Observable<OfflineCatalogProgress> = this.catalog.progress$;

  constructor(public context: OfflineContextService, private catalog: OfflineCatalogService, public auth: AuthService) {}

  refresh(): void {
    this.catalog.ensureCatalog(true);
  }

  reauthenticate(): void {
    this.auth.loginKeycloak('/venda/offline');
  }

  remaining(ms: number): string {
    if (ms <= 0) return 'atualização obrigatória';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}min restantes`;
  }

  icon(state: OfflineRuntimeState): string {
    if (state.catalogExpired) return 'fa-exclamation-triangle';
    if (!state.backendOnline) return 'fa-cloud-download-alt';
    return this.auth.isLoggedIn() ? 'fa-wifi' : 'fa-user-lock';
  }
}
