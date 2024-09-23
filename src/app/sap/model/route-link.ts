
export class RouteLink {
  
  label: string;
  path: string;
  params?: any;

  constructor(label : string, path : string, params: any = null){
    this.label = label
    this.path = path
    this.params = params
  }
}