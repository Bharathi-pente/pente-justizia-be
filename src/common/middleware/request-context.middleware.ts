import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  user?: any;
  cell_id?: string;
  cell_ids?: string[];
  requestId?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const context: RequestContext = {
      user: (req as any).user,
      requestId:
        (req.headers["x-request-id"] as string) || this.generateRequestId(),
    };

    requestContextStorage.run(context, () => {
      next();
    });
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
