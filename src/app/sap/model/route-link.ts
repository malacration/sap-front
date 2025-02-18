
export class RouteLink {
  
  label: string;
  path: any;
  params?: any;

  constructor(label : string, path : string, params: any = null){
    this.label = label
    this.path = path == null ? [] : path
    this.params = params
  }
}