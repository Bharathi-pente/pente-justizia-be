import { Request } from "express";
import { JwtPayload } from "./jwt-payload.types";

export interface RequestWithUser extends Request {
  user: JwtPayload;
  cell_ids?: string[]; // Attached by cell-scope guard
}
