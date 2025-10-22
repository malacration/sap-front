import { Route } from '@angular/router';

export class MenuItem {
  name: string = '';
  iconClasses: string = 'fas fa-circle';
  routerLink: string | null;
  url: string;
  regex: RegExp;
  children: MenuItem[] = [];
  readonly segments: string[];
  readonly isNavigable: boolean;
  readonly hasChildren: boolean;

  constructor(route: Route, parentSegments: string[]) {
    this.name = route.title?.toString() ?? '';
    this.iconClasses = this.resolveIcon(route);

    const segment = route.path ?? '';
    const segments = [...parentSegments];
    if (segment) {
      segments.push(segment);
    }
    this.segments = segments;

    this.hasChildren = (route.children?.length ?? 0) > 0;
    this.isNavigable = !!route.component || !!route.redirectTo || !!route.loadChildren;

    const path = segments.join('/');
    this.url = path ? `/${path}` : '/';
    this.routerLink = this.isNavigable ? this.url : null;
    this.regex = MenuItem.buildRegex(this.url);
  }

  get childSegments(): string[] {
    return [...this.segments];
  }

  private resolveIcon(route: Route): string {
    const routeData = route.data;
    if (Array.isArray(routeData)) {
      const iconEntry = routeData.find((entry: unknown) =>
        typeof entry === 'string' ? entry.startsWith('icon:') : false
      );
      if (iconEntry && typeof iconEntry === 'string') {
        const [, iconClass] = iconEntry.split(':');
        if (iconClass) {
          return iconClass.trim();
        }
      }
    } else if (routeData && typeof routeData === 'object') {
      const iconValue = (routeData as Record<string, unknown>)['icon'];
      if (typeof iconValue === 'string') {
        return iconValue;
      }
    }
    return 'fas fa-circle';
  }

  private static buildRegex(url: string): RegExp {
    let regexString = url || '/';
    if (!regexString.startsWith('/')) {
      regexString = `/${regexString}`;
    }
    regexString = regexString.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
    regexString = regexString.replace(/\\:([a-zA-Z0-9-_]+)/g, '[^\\/]+');
    regexString = regexString.replace(/\\\/\\\*\\\*/g, '(?:\\/.*)?');
    return new RegExp(`^${regexString}$`);
  }
}
