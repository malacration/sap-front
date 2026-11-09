import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ConfigService } from '../services/config.service';
import { AuthService } from '../../shared/service/auth.service';
import { OfflineContextService } from './offline-context.service';
import { offlineDb } from './offline.database';
import {
  OfflineCatalogJob,
  OfflineCatalogManifest,
  OfflineCatalogMeta,
  OfflineCatalogRecord,
} from './offline.models';

export interface OfflineCatalogProgress {
  active: boolean;
  progress: number;
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineCatalogService {
  private readonly baseUrl: string;
  private readonly host: string;
  private readonly progressSubject = new BehaviorSubject<OfflineCatalogProgress>({ active: false, progress: 0 });
  readonly progress$ = this.progressSubject.asObservable();

  constructor(
    config: ConfigService,
    private http: HttpClient,
    private auth: AuthService,
    private context: OfflineContextService
  ) {
    this.host = config.getHost();
    this.baseUrl = `${this.host}/offline/catalog`;
  }

  async ensureCatalog(force = false): Promise<void> {
    if (!this.context.offlineEnabled || !this.context.backendOnline || !this.auth.isLoggedIn() || this.progressSubject.value.active) return;
    if (!force && this.context.hasValidCatalog && this.context.snapshot.remainingMs > 12 * 60 * 60 * 1000) return;

    this.progressSubject.next({ active: true, progress: 0, message: 'Solicitando catálogo...' });
    try {
      let job = await firstValueFrom(
        this.http.post<OfflineCatalogJob>(`${this.baseUrl}/jobs?force=${force}`, {})
      );
      while (job.state !== 'READY') {
        if (job.state === 'FAILED') throw new Error(job.error || 'Falha ao gerar o catálogo offline');
        this.progressSubject.next({
          active: true,
          progress: job.progress || 0,
          message: job.state === 'QUEUED'
            ? `Atualização na fila${job.queuePosition ? ` (posição ${job.queuePosition})` : ''}...`
            : `Preparando ${this.datasetLabel(job.currentDataset)}...`,
        });
        await this.delay(2000);
        job = await firstValueFrom(this.http.get<OfflineCatalogJob>(`${this.baseUrl}/jobs/${job.id}`));
      }
      if (!job.snapshotId) throw new Error('O backend não informou o snapshot gerado');
      await this.download(job.snapshotId);
      this.progressSubject.next({ active: false, progress: 100, message: 'Dados offline atualizados' });
    } catch (error: any) {
      const message = error?.status === 404
        ? 'O modo offline ainda não está habilitado no backend'
        : (error?.error?.mensagem || error?.message || 'Não foi possível atualizar os dados offline');
      this.progressSubject.next({ active: false, progress: 0, error: message });
    }
  }

  private async download(snapshotId: string): Promise<void> {
    const manifest = await firstValueFrom(
      this.http.get<OfflineCatalogManifest>(`${this.baseUrl}/snapshots/${snapshotId}/manifest`)
    );
    const ownerKey = `${this.host}::${manifest.userId}`;
    const grouped = new Map<string, typeof manifest.parts>();
    manifest.parts.forEach(part => grouped.set(part.dataset, [...(grouped.get(part.dataset) || []), part]));
    const records: OfflineCatalogRecord[] = [];
    let profile: any = {};
    let completed = 0;

    for (const [dataset, parts] of grouped.entries()) {
      const ordered = parts.sort((a, b) => a.index - b.index);
      const chunks: Uint8Array[] = [];
      for (const part of ordered) {
        const buffer = await firstValueFrom(
          this.http.get(`${this.baseUrl}/snapshots/${snapshotId}/parts/${part.id}`, { responseType: 'arraybuffer' })
        );
        const bytes = new Uint8Array(buffer);
        if ((await this.sha256(bytes)) !== part.sha256) throw new Error(`Parte inválida: ${part.id}`);
        chunks.push(bytes);
      }
      const value = JSON.parse(await this.gunzip(this.concat(chunks)));
      if (dataset === 'profile') profile = value;
      records.push(...this.toRecords(ownerKey, dataset, value));
      completed++;
      this.progressSubject.next({
        active: true,
        progress: Math.round((completed / grouped.size) * 100),
        message: `Baixando ${this.datasetLabel(dataset)}...`,
      });
    }

    const meta: OfflineCatalogMeta = {
      ownerKey,
      snapshotId: manifest.snapshotId,
      schemaVersion: manifest.schemaVersion,
      generatedAt: Date.parse(manifest.generatedAt),
      expiresAt: Date.parse(manifest.expiresAt),
      userId: manifest.userId,
      userName: manifest.userName,
    };
    await offlineDb.transaction('rw', offlineDb.catalogMeta, offlineDb.catalogRecords, async () => {
      await offlineDb.catalogRecords.where('ownerKey').equals(ownerKey).delete();
      await offlineDb.catalogRecords.bulkPut(records);
      await offlineDb.catalogMeta.put(meta);
    });
    await this.context.activateCatalog(meta, profile);
  }

  private toRecords(ownerKey: string, dataset: string, raw: any): OfflineCatalogRecord[] {
    const values = Array.isArray(raw) ? raw : [raw];
    return values.map((value, index) => {
      const key = this.recordKey(dataset, value, index);
      return {
        id: `${ownerKey}::${dataset}::${key}`,
        ownerKey,
        dataset,
        key,
        searchText: this.searchText(value),
        value,
      };
    });
  }

  private recordKey(dataset: string, value: any, index: number): string {
    const item = value?.product ?? value;
    switch (dataset) {
      case 'branches': return String(item.BPLID ?? item.BPLId ?? index);
      case 'businessPartners': return String(item.CardCode ?? item.cardCode ?? index);
      case 'products': return `${value.branchId}:${item.ItemCode}:${item.PriceList ?? ''}`;
      case 'paymentMethods': return `${value.branchId}:${value.cardCode}`;
      case 'paymentTerms': return String(value.priceList);
      case 'commissionByPriceList': return String(value.priceList);
      case 'commissions':
      case 'freightRegions':
      case 'localities': return String(item.Code ?? index);
      default: return String(index);
    }
  }

  private searchText(value: any): string {
    return JSON.stringify(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private concat(chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
    const output = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
    let offset = 0;
    chunks.forEach(chunk => {
      output.set(chunk, offset);
      offset += chunk.length;
    });
    return output;
  }

  private async gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
    const Decompression = (window as any).DecompressionStream;
    if (!Decompression) {
      throw new Error('Este navegador não suporta a descompressão do catálogo offline');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new Decompression('gzip'));
    return new Response(stream).text();
  }

  private async sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  private datasetLabel(dataset?: string): string {
    const labels: Record<string, string> = {
      branches: 'filiais',
      businessPartners: 'clientes',
      products: 'produtos',
      paymentMethods: 'formas de pagamento',
      paymentTerms: 'condições de pagamento',
      commissions: 'regras comerciais',
      commissionByPriceList: 'limites de desconto',
      freightRegions: 'fretes',
      localities: 'localidades',
      profile: 'perfil',
    };
    return labels[dataset || ''] || 'dados';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }
}
