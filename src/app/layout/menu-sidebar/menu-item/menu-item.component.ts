import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { openCloseAnimation, rotateAnimation } from './menu-item.animations';
import { MenuItem } from '../menu-item.model';

@Component({
  selector: 'app-menu-item',
  templateUrl: './menu-item.component.html',
  styleUrls: ['./menu-item.component.scss'],
  animations: [openCloseAnimation, rotateAnimation],
})
export class MenuItemComponent implements OnInit, OnDestroy {
  @Input() menuItem!: MenuItem;
  @Input() depth = 0;

  expanded = false;
  isMainActive = false;
  hasActiveChild = false;

  private currentUrl = '/';
  private userExpanded: boolean | null = null;
  private routerSubscription?: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.currentUrl = this.normalizeUrl(this.router.url);
    this.updateActivationState();
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects || event.url;
        this.currentUrl = this.normalizeUrl(url);
        this.updateActivationState();
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  get containerClasses(): Record<string, boolean> {
    return {
      'nav-item': true,
      'has-treeview': this.isExpandable,
      'menu-open': this.isExpandable && this.expanded,
      'menu-is-opening': this.isExpandable && this.expanded,
    };
  }

  get isExpandable(): boolean {
    return this.menuItem?.hasChildren ?? false;
  }

  get iconClasses(): string {
    return (
      this.menuItem?.iconClasses ||
      (this.depth > 0 ? 'far fa-circle' : 'fas fa-circle')
    );
  }

  get linkPadding(): number {
    const rootPadding = 14;
    const increment = 14;
    return rootPadding + this.depth * increment;
  }

  onMainClick(event: MouseEvent): void {
    if (this.isExpandable && !this.menuItem.isNavigable) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleExpand();
    }
  }

  onToggleArrow(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleExpand();
  }

  isPathActive(item: MenuItem): boolean {
    return item.regex.test(this.currentUrl);
  }

  trackByChild(_: number, item: MenuItem): string {
    return item.url;
  }

  private toggleExpand(): void {
    this.userExpanded = !this.expanded;
    this.expanded = !this.expanded;
  }

  private updateActivationState(): void {
    const childActive = this.menuItem.children.some((child) =>
      this.isPathActive(child)
    );
    const mainActive = this.isPathActive(this.menuItem);

    this.hasActiveChild = childActive;
    this.isMainActive = mainActive;

    if (this.hasActiveChild || this.isMainActive) {
      this.expanded = true;
      return;
    }

    if (this.userExpanded !== null) {
      this.expanded = this.userExpanded;
    } else {
      this.expanded = false;
    }
  }

  private normalizeUrl(url: string): string {
    const trimmed = url.split('?')[0].split('#')[0];
    return trimmed.endsWith('/') && trimmed.length > 1
      ? trimmed.slice(0, -1)
      : trimmed;
  }
}
