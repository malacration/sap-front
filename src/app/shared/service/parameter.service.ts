import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

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
    this.updateParams(route, { [paramName]: null });
  }

  setParam(route: ActivatedRoute, paramName: string, value: string): void {
    this.updateParams(route, { [paramName]: value });
  }

  hasParam(route: ActivatedRoute, paramName: string): boolean {
    return route.snapshot.queryParamMap.get(paramName) !== null;
  }

  updateParams(
    route: ActivatedRoute,
    params: Record<string, string | null | undefined>
  ): void {
    const nextParams = { ...route.snapshot.queryParams };

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        delete nextParams[key];
      } else {
        nextParams[key] = value;
      }
    });

    this.router.navigate([], {
      relativeTo: route,
      queryParams: nextParams,
      replaceUrl: true,
    });
  }

}
