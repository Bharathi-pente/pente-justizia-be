import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "../../modules/audit/entities/audit-log.entity";
import { JwtPayload } from "../types/jwt-payload.types";

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only log mutating operations
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return next.handle();
    }

    const user: JwtPayload = request.user;
    const action = `${method} ${request.route?.path || request.url}`;
    const resource = this.extractResourceFromPath(
      request.route?.path || request.url,
    );
    const resourceId = request.params?.id || null;
    const ip = request.ip || request.connection.remoteAddress;

    return next.handle().pipe(
      tap({
        next: async () => {
          if (user && user.sub) {
            await this.auditLogRepository
              .save({
                user_id: user.sub,
                action,
                resource,
                resource_id: resourceId,
                ip,
              })
              .catch((err) => {
                console.error("Failed to create audit log:", err);
              });
          }
        },
        error: () => {
          // Log failed attempts as well
          if (user && user.sub) {
            this.auditLogRepository
              .save({
                user_id: user.sub,
                action: `${action} (FAILED)`,
                resource,
                resource_id: resourceId,
                ip,
              })
              .catch((err) => {
                console.error("Failed to create audit log:", err);
              });
          }
        },
      }),
    );
  }

  private extractResourceFromPath(path: string): string {
    // Extract resource name from path (e.g., /api/cases/:id -> cases)
    const match = path.match(/\/api\/([^\/\?]+)/);
    return match ? match[1] : "unknown";
  }
}
