export interface NotImplementedPayload {
  namespace: string;
  message: string;
}

export class NotImplementedService {
  public getPayload(namespace: string): NotImplementedPayload {
    return {
      namespace,
      message: `${namespace} routes will be implemented in a later phase.`
    };
  }
}
