import { Injectable } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscribable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ParameterService {
  
  constructor(private router: Router) {}

  subscribeToParam(
    route: ActivatedRoute,
    paramName: string,
    action: (value: string | null) => void
  ): Array<Subscription> {
    const queryParamSub = route.queryParams.subscribe((params) => {
      const paramValue = params[paramName] || null;
      action(paramValue);
    });

    return [queryParamSub]
  }

  removeParam(route: ActivatedRoute, paramName: string): void {
    this.router.navigate([], {
      relativeTo: route,
      queryParams: { [paramName]: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  setParam(route: ActivatedRoute, paramName: string, value: string): void {
    this.router.navigate([], {
      relativeTo: route,
      queryParams: { [paramName]: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

}