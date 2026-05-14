import { SetMetadata } from "@nestjs/common";

export const CELL_SCOPE_KEY = "cell_scope";
export const CellScope = () => SetMetadata(CELL_SCOPE_KEY, true);
