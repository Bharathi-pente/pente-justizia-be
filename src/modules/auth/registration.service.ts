import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { KeycloakAdminService } from './keycloak-admin.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { PublicSignupDto } from './dto/public-signup.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class RegistrationService {
  constructor(
    private prisma: PrismaService,
    private keycloakAdmin: KeycloakAdminService,
  ) {}

  /**
   * WORKFLOW 1: Admin creates user directly
   * HQ admins can create any type of user
   */
  async createUserByAdmin(adminId: string, dto: RegisterUserDto) {
    // Validate that the role is a valid UserRole enum value
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(dto.role as UserRole)) {
      throw new BadRequestException('Invalid role specified');
    }

    // Check if user already exists in our database
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new HttpException(
        'User already exists with this email',
        HttpStatus.CONFLICT,
      );
    }

    // Create user in Keycloak
    const keycloakUserId = await this.keycloakAdmin.createUser({
      email: dto.email,
      username: dto.email.split('@')[0],
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
      emailVerified: true,
    });

    // Assign role in Keycloak
    await this.keycloakAdmin.assignRole(keycloakUserId, dto.role);

    // Create user record in our database
    const user = await this.prisma.user.create({
      data: {
        keycloakId: keycloakUserId,
        email: dto.email,
        fullName: `${dto.firstName} ${dto.lastName}`,
        role: dto.role as UserRole,
        cellId: null,
        fundedCellIds: [],
      },
    });

    return {
      message: 'User created successfully',
      userId: user.id,
      keycloakUserId,
    };
  }

  /**
   * WORKFLOW 2: Cell admin creates invitation for cell users
   */
  async createInvitation(adminId: string, dto: CreateInvitationDto) {
    // Generate secure random token
    const token = randomBytes(32).toString('hex');

    // Set expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        token,
        role: dto.role as UserRole,
        cellId: dto.cellId,
        invitedBy: adminId,
        message: dto.message,
        expiresAt,
        used: false,
      },
    });

    // TODO: Send invitation email with link
    const invitationLink = `${process.env.FRONTEND_URL}/signup/invite/${token}`;

    return {
      message: 'Invitation created successfully',
      invitationId: invitation.id,
      invitationLink,
      expiresAt,
    };
  }

  /**
   * Get invitation details by token (public endpoint)
   */
  async getInvitationByToken(token: string) {
    return this.prisma.invitation.findFirst({
      where: {
        token,
        used: false,
        expiresAt: {
          gte: new Date(),
        },
      },
    });
  }

  /**
   * WORKFLOW 2 (cont): Accept invitation and create account
   */
  async acceptInvitation(dto: AcceptInvitationDto) {
    // Find invitation
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        token: dto.token,
        used: false,
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    // Verify email matches
    if (invitation.email !== dto.email) {
      throw new BadRequestException('Email does not match invitation');
    }

    // Create user in Keycloak
    const keycloakUserId = await this.keycloakAdmin.createUser({
      email: dto.email,
      username: dto.email.split('@')[0],
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
      emailVerified: true,
    });

    // Assign role
    await this.keycloakAdmin.assignRole(keycloakUserId, invitation.role);

    // Set cell_id attribute if applicable
    if (invitation.cellId) {
      await this.keycloakAdmin.setUserAttributes(keycloakUserId, {
        cell_id: invitation.cellId,
      });
    }

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        keycloakId: keycloakUserId,
        email: dto.email,
        fullName: `${dto.firstName} ${dto.lastName}`,
        role: invitation.role,
        cellId: invitation.cellId,
        fundedCellIds: [],
      },
    });

    // Mark invitation as used
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { used: true },
    });

    return {
      message: 'Account created successfully',
      userId: user.id,
    };
  }

  /**
   * WORKFLOW 3: Public signup for funders/insurers
   * Creates a pending user that requires approval
   */
  async publicSignup(dto: PublicSignupDto) {
    // Validate role - only funder/insurer allowed
    if (dto.role !== 'funder' && dto.role !== 'insurer') {
      throw new BadRequestException('Only funders and insurers can use public signup');
    }

    // Check if email already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Check if pending request exists
    const existingPending = await this.prisma.pendingUser.findUnique({
      where: { email: dto.email },
    });

    if (existingPending && existingPending.status === 'pending') {
      throw new BadRequestException('A signup request is already pending for this email');
    }

    // Create pending user (not in Keycloak yet)
    const pendingUser = await this.prisma.pendingUser.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        organization: dto.organization,
        requestedRole: dto.role as UserRole,
        status: 'pending',
      },
    });

    // TODO: Notify HQ admins via email

    return {
      message: 'Signup request submitted successfully. You will be notified once approved.',
      pendingUserId: pendingUser.id,
    };
  }

  /**
   * HQ admin: Get all pending user registrations
   */
  async getPendingUsers() {
    return this.prisma.pendingUser.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * HQ admin: Approve pending user
   */
  async approvePendingUser(
    adminId: string,
    pendingUserId: string,
    fundedCellIds?: string[],
  ) {
    const pendingUser = await this.prisma.pendingUser.findUnique({
      where: { id: pendingUserId },
    });

    if (!pendingUser) {
      throw new BadRequestException('Pending user not found');
    }

    if (pendingUser.status !== 'pending') {
      throw new BadRequestException('User already processed');
    }

    // Generate temporary password
    const tempPassword = randomBytes(16).toString('hex');

    // Create user in Keycloak
    const keycloakUserId = await this.keycloakAdmin.createUser({
      email: pendingUser.email,
      username: pendingUser.email.split('@')[0],
      firstName: pendingUser.firstName,
      lastName: pendingUser.lastName,
      password: tempPassword,
      emailVerified: true,
    });

    // Assign role
    await this.keycloakAdmin.assignRole(keycloakUserId, pendingUser.requestedRole);

    // Set funded_cell_ids if funder
    if (pendingUser.requestedRole === 'funder' && fundedCellIds) {
      await this.keycloakAdmin.setUserAttributes(keycloakUserId, {
        funded_cell_ids: fundedCellIds.join(','),
      });
    }

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        keycloakId: keycloakUserId,
        email: pendingUser.email,
        fullName: `${pendingUser.firstName} ${pendingUser.lastName}`,
        role: pendingUser.requestedRole,
        cellId: null,
        fundedCellIds: fundedCellIds || [],
      },
    });

    // Update pending user
    await this.prisma.pendingUser.update({
      where: { id: pendingUserId },
      data: {
        status: 'approved',
        keycloakUserId,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    // TODO: Send email with temporary password

    return {
      message: 'User approved and created successfully',
      userId: user.id,
      temporaryPassword: tempPassword,
    };
  }

  /**
   * HQ admin: Reject pending user
   */
  async rejectPendingUser(adminId: string, pendingUserId: string, reason: string) {
    const pendingUser = await this.prisma.pendingUser.findUnique({
      where: { id: pendingUserId },
    });

    if (!pendingUser) {
      throw new BadRequestException('Pending user not found');
    }

    if (pendingUser.status !== 'pending') {
      throw new BadRequestException('User already processed');
    }

    // Update pending user
    await this.prisma.pendingUser.update({
      where: { id: pendingUserId },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    // TODO: Send rejection email

    return {
      message: 'User registration rejected',
    };
  }

  /**
   * Get total users count
   */
  async getTotalUsers(): Promise<number> {
    return this.prisma.user.count();
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        cellId: true,
        createdAt: true,
        cell: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get users count by role prefix (e.g., 'hq_', 'cell_')
   */
  async getUsersByRolePrefix(prefix: string): Promise<number> {
    const roles = Object.values(UserRole).filter(role => role.startsWith(prefix));
    return this.prisma.user.count({
      where: {
        role: { in: roles },
      },
    });
  }

  /**
   * Get pending users count
   */
  async getPendingUsersCount(): Promise<number> {
    return this.prisma.pendingUser.count({
      where: { status: 'pending' },
    });
  }

  /**
   * Update user
   */
  async updateUser(userId: string, dto: UpdateUserDto) {
    // Find user in database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Update in Keycloak
    const updates: any = {};
    if (dto.email) updates.email = dto.email;
    if (dto.firstName || dto.lastName) {
      if (dto.firstName) updates.firstName = dto.firstName;
      if (dto.lastName) updates.lastName = dto.lastName;
    }

    if (Object.keys(updates).length > 0) {
      await this.keycloakAdmin.updateUser(user.keycloakId, updates);
    }

    // Update role if changed
    if (dto.role && dto.role !== user.role) {
      await this.keycloakAdmin.assignRole(user.keycloakId, dto.role);
    }

    // Update in database
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: dto.email || user.email,
        fullName: (dto.firstName && dto.lastName) 
          ? `${dto.firstName} ${dto.lastName}`
          : user.fullName,
        role: (dto.role as UserRole) || user.role,
      },
    });

    return {
      message: 'User updated successfully',
      user: updatedUser,
    };
  }

  /**
   * Delete user (from both Keycloak and database)
   */
  async deleteUser(userId: string) {
    // Find user in database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Delete from Keycloak
    try {
      await this.keycloakAdmin.deleteUser(user.keycloakId);
    } catch (error) {
      console.error('Failed to delete user from Keycloak:', error);
      // Continue with database deletion even if Keycloak deletion fails
    }

    // Delete from database
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      message: 'User deleted successfully',
    };
  }
}
