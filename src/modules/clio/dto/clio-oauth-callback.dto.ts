import { IsString } from "class-validator";

export class ClioOAuthCallbackDto {
  @IsString()
  code: string;

  @IsString()
  state: string;
}
