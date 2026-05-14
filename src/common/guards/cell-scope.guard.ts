import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { JwtPayload } from "../types/jwt-payload.types";
import { RequestWithUser } from "../types/request-with-user.types";

@Injectable()
export class CellScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request: RequestWithUser = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !user.realm_access?.roles) {
      return true; // Let auth guard handle this
    }

    const userRole = user.realm_access.roles[0]; // Primary role

    // HQ roles have access to all cells
    if (["hq_admin", "hq_compliance", "hq_bdm"].includes(userRole)) {
      request.cell_ids = ["*"]; // Wildcard access
      return true;
    }

    // Insurer has access to all cells (insurance data only)
    if (userRole === "insurer") {
      request.cell_ids = ["*"];
      return true;
    }

    // Cell roles - enforce cell scoping
    if (["cell_admin", "cell_solicitor", "cell_paralegal"].includes(userRole)) {
      if (!user.cell_id) {
        throw new ForbiddenException("Cell ID not found in user token");
      }

      // Check if request is trying to access a different cell
      const requestedCellId =
        request.params?.cellId ||
        request.query?.cellId ||
        request.body?.cell_id;

      if (requestedCellId && requestedCellId !== user.cell_id) {
        throw new ForbiddenException(
          "Access denied: You can only access your own cell",
        );
      }

      request.cell_ids = [user.cell_id];
      return true;
    }

    // Funder - access to funded cells only
    if (userRole === "funder") {
      if (!user.funded_cell_ids || user.funded_cell_ids.length === 0) {
        throw new ForbiddenException("No funded cells assigned");
      }

      const requestedCellId =
        request.params?.cellId ||
        request.query?.cellId ||
        request.body?.cell_id;

      if (requestedCellId && !user.funded_cell_ids.includes(requestedCellId)) {
        throw new ForbiddenException(
          "Access denied: You can only access funded cells",
        );
      }

      request.cell_ids = user.funded_cell_ids;
      return true;
    }

    return true;
  }
}
