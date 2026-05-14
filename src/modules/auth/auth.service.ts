import { Injectable } from "@nestjs/common";
import { JwtPayload } from "../../common/types/jwt-payload.types";
import { PrismaService } from "../../database/prisma.service";
import { UserProfileDto } from "./dto/user-profile.dto";
import { User, UserRole } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Sync user from Keycloak JWT token to database
   * Creates user if doesn't exist, updates last_login_at if exists
   */
  async syncUserFromToken(jwtPayload: JwtPayload): Promise<User> {
    const keycloakId = jwtPayload.sub;

    // Find existing user by keycloakId
    let user = await this.prisma.user.findUnique({
      where: { keycloakId },
    });

    if (!user) {
      // Create new user from JWT payload
      const role = (jwtPayload.realm_access?.roles.find(r => 
        Object.values(UserRole).includes(r as UserRole)
      ) || 'cell_paralegal') as UserRole;

      user = await this.prisma.user.create({
        data: {
          keycloakId,
          email: jwtPayload.email,
          fullName: jwtPayload.name,
          role,
          cellId: jwtPayload.cell_id || null,
          fundedCellIds: jwtPayload.funded_cell_ids || [],
        },
      });
    } else {
      // Update timestamp
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { updatedAt: new Date() },
      });
    }

    return user;
  }

  /**
   * Get user profile from JWT payload
   */
  getUserProfile(jwtPayload: JwtPayload): UserProfileDto {
    return {
      id: jwtPayload.sub,
      email: jwtPayload.email,
      name: jwtPayload.name,
      roles: jwtPayload.realm_access?.roles || [],
      cell_id: jwtPayload.cell_id,
      funded_cell_ids: jwtPayload.funded_cell_ids,
    };
  }
}
