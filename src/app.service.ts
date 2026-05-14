import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Justizia Backend API",
      version: "1.0.0",
    };
  }
}
