import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { KeycloakAdminService } from "../auth/keycloak-admin.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserRole, ConsentStatus, OnboardingStatus, ClientType } from "./entities/user.entity";

interface UserContext {
  keycloakId: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private keycloakAdmin: KeycloakAdminService,
  ) {}

  async create(createUserDto: CreateUserDto, createdByKeycloakId: string): Promise<any> {
    // Create user in Keycloak first
    const nameParts = createUserDto.full_name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    const keycloakUserId = await this.keycloakAdmin.createUser({
      email: createUserDto.email,
      username: createUserDto.email.split("@")[0],
      firstName,
      lastName,
      password: createUserDto.password || "TempPassword123!", // Temporary password
      emailVerified: false,
    });

    // Assign role in Keycloak
    await this.keycloakAdmin.assignRole(keycloakUserId, createUserDto.role);

    // Create user in database with creator reference
    const user = await this.prisma.user.create({
      data: {
        keycloakId: keycloakUserId,
        email: createUserDto.email,
        fullName: createUserDto.full_name,
        role: createUserDto.role as UserRole,
        cellId: createUserDto.cell_id || null,
        clientName: createUserDto.client_name || null,
        phone: createUserDto.phone || null,
        address: createUserDto.address || null,
        consentStatus: createUserDto.consent_status as ConsentStatus || ConsentStatus.PENDING,
        gdprStatus: createUserDto.gdpr_status || false,
        verificationStatus: createUserDto.verification_status || false,
        onboardingStatus: createUserDto.onboarding_status as OnboardingStatus || OnboardingStatus.NOT_STARTED,
        linkedCaseCount: createUserDto.linked_case_count || 0,
        clientType: createUserDto.client_type as ClientType || null,
        vulnerabilityFlag: createUserDto.vulnerability_flag || false,
        preferredContactMethod: createUserDto.preferred_contact_method || null,
        creatorKeycloakId: createdByKeycloakId,
      },
      include: { cell: true },
    });

    return user;
  }

  async findAll(
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      cellId?: string;
    },
    userContext?: UserContext,
  ): Promise<{ data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Apply creator filtering based on user role
    if (userContext) {
      if (userContext.role === UserRole.HQ_ADMIN) {
        // HQ Admin can see users created by all HQ admins
        // Get all HQ admin keycloakIds
        const hqAdmins = await this.prisma.user.findMany({
          where: { role: UserRole.HQ_ADMIN },
          select: { keycloakId: true },
        });
        const hqAdminIds = hqAdmins.map((admin) => admin.keycloakId);
        where.creatorKeycloakId = { in: hqAdminIds };
      } else {
        // Other roles can only see users they created
        where.creatorKeycloakId = userContext.keycloakId;
      }
    } else {
      // No context provided - show all (for backwards compatibility with internal calls)
    }

    // Apply search filter
    if (params?.search) {
      where.OR = [
        { email: { contains: params.search, mode: "insensitive" } },
        { fullName: { contains: params.search, mode: "insensitive" } },
        { clientName: { contains: params.search, mode: "insensitive" } },
      ];
    }
    // Apply role filter
    if (params?.role) {
      where.role = params.role;
    }
    // Apply cellId filter
    if (params?.cellId) {
      where.cellId = params.cellId;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { cell: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { cell: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update in Keycloak if email or name changed
    if (updateUserDto.email || updateUserDto.full_name) {
      const nameParts = (updateUserDto.full_name || user.fullName).split(" ");
      await this.keycloakAdmin.updateUser(user.keycloakId, {
        email: updateUserDto.email || user.email,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || nameParts[0] || "",
      });
    }

    // Update role in Keycloak if role changed
    if (updateUserDto.role && updateUserDto.role !== user.role) {
      // Note: Keycloak doesn't have a "remove role" method in the service
      // You may need to get current roles and remove them first
      await this.keycloakAdmin.assignRole(user.keycloakId, updateUserDto.role);
    }

    // Update in database
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        email: updateUserDto.email,
        fullName: updateUserDto.full_name,
        role: updateUserDto.role,
        cellId: updateUserDto.cell_id,
        clientName: updateUserDto.client_name,
        phone: updateUserDto.phone,
        address: updateUserDto.address,
        consentStatus: updateUserDto.consent_status,
        gdprStatus: updateUserDto.gdpr_status,
        verificationStatus: updateUserDto.verification_status,
        onboardingStatus: updateUserDto.onboarding_status,
        linkedCaseCount: updateUserDto.linked_case_count,
        clientType: updateUserDto.client_type,
        vulnerabilityFlag: updateUserDto.vulnerability_flag,
        preferredContactMethod: updateUserDto.preferred_contact_method,
      },
      include: { cell: true },
    });

    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Delete from Keycloak
    await this.keycloakAdmin.deleteUser(user.keycloakId);

    // Delete from database (soft delete or hard delete based on your needs)
    await this.prisma.user.delete({ where: { id } });
  }
}