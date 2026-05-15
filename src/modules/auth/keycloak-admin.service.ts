import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class KeycloakAdminService {
  private adminToken: string | null = null;
  private tokenExpiry: number = 0;

  private readonly keycloakUrl = process.env.KEYCLOAK_AUTH_SERVER_URL;
  private readonly realm = process.env.KEYCLOAK_REALM;
  private readonly adminClientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
  private readonly adminUsername = process.env.KEYCLOAK_ADMIN_USERNAME;
  private readonly adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;

  /**
   * Get admin access token (cached with auto-refresh)
   */
  private async getAdminToken(): Promise<string> {
    const now = Date.now();
    
    // Return cached token if still valid
    if (this.adminToken && now < this.tokenExpiry) {
      return this.adminToken;
    }

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', this.adminClientId || '');
      params.append('username', this.adminUsername || '');
      params.append('password', this.adminPassword || '');

      const response = await axios.post(
        `${this.keycloakUrl}/realms/master/protocol/openid-connect/token`,
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      this.adminToken = response.data.access_token;
      // Set expiry to 90% of token lifetime to be safe
      this.tokenExpiry = now + (response.data.expires_in * 1000 * 0.9);

      return this.adminToken!;
    } catch (error) {
      throw new HttpException(
        'Failed to authenticate with Keycloak admin',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new user in Keycloak
   */
  async createUser(userData: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    emailVerified?: boolean;
  }): Promise<string> {
    const token = await this.getAdminToken();

    try {
      // Step 1: Create user
      const createResponse = await axios.post(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users`,
        {
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          enabled: true,
          emailVerified: userData.emailVerified ?? false,
          credentials: [
            {
              type: 'password',
              value: userData.password,
              temporary: false,
            },
          ],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Extract user ID from Location header
      const location = createResponse.headers.location;
      const userId = location.split('/').pop();

      return userId!;
    } catch (error: any) {
      console.error('Keycloak user creation error:', error.response?.data);
      
      // Check if user already exists
      const errorMessage = error.response?.data?.errorMessage || '';
      if (errorMessage.includes('exists') || errorMessage.includes('already') || error.response?.status === 409) {
        throw new HttpException(
          'User already exists with this email',
          HttpStatus.CONFLICT,
        );
      }
      
      throw new HttpException(
        error.response?.data?.errorMessage || 'Failed to create user in Keycloak',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<any> {
    const token = await this.getAdminToken();

    try {
      const response = await axios.get(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users`,
        {
          params: { email, exact: true },
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data[0] || null;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch user from Keycloak',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user's realm roles
   */
  async getUserRoles(userId: string): Promise<any[]> {
    const token = await this.getAdminToken();

    try {
      const response = await axios.get(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data || [];
    } catch (error) {
      throw new HttpException(
        'Failed to fetch user roles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove a role from a user
   */
  async removeRole(userId: string, roleName: string): Promise<void> {
    const token = await this.getAdminToken();

    try {
      // Get role representation
      const roleResponse = await axios.get(
        `${this.keycloakUrl}/admin/realms/${this.realm}/roles/${roleName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Remove role from user
      await axios.delete(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: [roleResponse.data],
        },
      );
    } catch (error: any) {
      // Don't throw error if role doesn't exist or wasn't assigned
      console.log('Note: Could not remove role', roleName, 'from user', userId);
    }
  }

  /**
   * Assign a role to a user (replaces existing application roles)
   */
  async assignRole(userId: string, roleName: string): Promise<void> {
    const token = await this.getAdminToken();

    try {
      // List of all application roles
      const appRoles = [
        'hq_admin',
        'hq_compliance',
        'hq_bdm',
        'cell_admin',
        'cell_solicitor',
        'cell_paralegal',
        'funder',
        'insurer',
      ];

      // Remove all existing application roles first
      for (const role of appRoles) {
        if (role !== roleName) {
          await this.removeRole(userId, role);
        }
      }

      // Get new role representation
      const roleResponse = await axios.get(
        `${this.keycloakUrl}/admin/realms/${this.realm}/roles/${roleName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Assign new role to user
      await axios.post(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        [roleResponse.data],
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.errorMessage || 'Failed to assign role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Set custom attributes on a user
   */
  async setUserAttributes(userId: string, attributes: Record<string, string>): Promise<void> {
    const token = await this.getAdminToken();

    try {
      await axios.put(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`,
        {
          attributes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (error) {
      throw new HttpException(
        'Failed to set user attributes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    const token = await this.getAdminToken();

    try {
      await axios.put(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/send-verify-email`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (error) {
      throw new HttpException(
        'Failed to send verification email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    enabled: boolean;
  }>): Promise<void> {
    const token = await this.getAdminToken();

    try {
      await axios.put(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`,
        updates,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (error) {
      throw new HttpException(
        'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    const token = await this.getAdminToken();

    try {
      await axios.delete(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (error) {
      throw new HttpException(
        'Failed to delete user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
