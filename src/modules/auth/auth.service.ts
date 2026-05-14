import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtPayload } from "../../common/types/jwt-payload.types";
import { User } from "../users/entities/user.entity";
import { UserProfileDto } from "./dto/user-profile.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Sync user from Keycloak JWT token to database
   * Creates user if doesn't exist, updates last_login_at if exists
   */
  async syncUserFromToken(jwtPayload: JwtPayload): Promise<User> {
    const keycloakId = jwtPayload.sub;

    // Find existing user by keycloak_id
    let user = await this.userRepository.findOne({
      where: { keycloak_id: keycloakId },
    });

    if (!user) {
      // Create new user from JWT payload
      const role = jwtPayload.realm_access?.roles[0] || "cell_paralegal";

      user = this.userRepository.create({
        keycloak_id: keycloakId,
        email: jwtPayload.email,
        full_name: jwtPayload.name,
        role: role as any,
        cell_id: jwtPayload.cell_id || null,
        is_active: true,
      });

      await this.userRepository.save(user);
    } else {
      // Update last login
      user.updated_at = new Date();
      await this.userRepository.save(user);
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
