import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { Public } from "./common/decorators/public.decorator";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getRoot(): object {
    return {
      message: "Justizia Backend API",
      version: "1.0.0",
      docs: "/api/docs",
    };
  }

  @Get("health")
  @Public()
  getHealth(): object {
    return this.appService.getHealth();
  }
}
