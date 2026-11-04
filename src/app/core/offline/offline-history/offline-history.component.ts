import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { OfflineQueueService } from '../offline-queue.service';
import { OfflineQueueRecord, OfflineQueueStatus } from '../offline.models';

@Component({
    selector: 'app-offline-history',
    templateUrl: './offline-history.component.html',
    styleUrls: ['./offline-history.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class OfflineHistoryComponent {
  readonly queue$: Observable<OfflineQueueRecord[]> = this.queue.queue$;
  filter: OfflineQueueStatus | 'ALL' = 'ALL';
  selected?: OfflineQueueRecord;

  constructor(public queue: OfflineQueueService, private router: Router) {}

  visible(records: OfflineQueueRecord[]): OfflineQueueRecord[] {
    if (this.filter === 'ALL') return records;
    if (this.filter === 'PENDING') return records.filter(record => ['PENDING', 'SYNCING'].includes(record.status));
    if (this.filter === 'ERROR') return records.filter(record => ['ERROR', 'REJECTED'].includes(record.status));
    return records.filter(record => record.status === this.filter);
  }

  count(records: OfflineQueueRecord[], statuses: OfflineQueueStatus[]): number {
    return records.filter(record => statuses.includes(record.status)).length;
  }

  edit(record: OfflineQueueRecord): void {
    this.router.navigate(['/venda/document'], { queryParams: { offlineEdit: record.localId } });
  }

  retry(record: OfflineQueueRecord): void {
    this.queue.retry(record.localId);
  }

  remove(record: OfflineQueueRecord): void {
    if (window.confirm(`Excluir a cotação local ${record.localId}?`)) this.queue.remove(record.localId);
  }

  label(status: OfflineQueueStatus): string {
    return {
      PENDING: 'Pendente',
      SYNCING: 'Transmitindo',
      ERROR: 'Erro',
      TRANSMITTED: 'Transmitida',
      PENDING_AUTHORIZATION: 'Aguardando autorização',
      REJECTED: 'Rejeitada',
    }[status];
  }
}
