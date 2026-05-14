import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClioConnection } from "./entities/clio-connection.entity";
import * as CryptoJS from "crypto-js";
import axios from "axios";

@Injectable()
export class ClioService {
  private readonly encryptionKey: string;
  private readonly clioClientId: string;
  private readonly clioClientSecret: string;
  private readonly clioRedirectUri: string;

  constructor(
    @InjectRepository(ClioConnection)
    private clioConnectionRepository: Repository<ClioConnection>,
  ) {
    this.encryptionKey = process.env.ENCRYPTION_KEY || "";
    this.clioClientId = process.env.CLIO_CLIENT_ID || "";
    this.clioClientSecret = process.env.CLIO_CLIENT_SECRET || "";
    this.clioRedirectUri = process.env.CLIO_REDIRECT_URI || "";
  }

  /**
   * Generate Clio OAuth URL for cell
   */
  generateOAuthUrl(cellId: string): string {
    const state = Buffer.from(JSON.stringify({ cellId })).toString("base64");
    return `https://app.clio.com/oauth/authorize?response_type=code&client_id=${this.clioClientId}&redirect_uri=${this.clioRedirectUri}&state=${state}`;
  }

  /**
   * Handle OAuth callback and save tokens
   */
  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<ClioConnection> {
    // Decode state to get cellId
    const { cellId } = JSON.parse(Buffer.from(state, "base64").toString());

    // Exchange code for tokens
    const tokenResponse = await axios.post("https://app.clio.com/oauth/token", {
      client_id: this.clioClientId,
      client_secret: this.clioClientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: this.clioRedirectUri,
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Encrypt tokens
    const encryptedAccessToken = this.encrypt(access_token);
    const encryptedRefreshToken = this.encrypt(refresh_token);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Save or update connection
    let connection = await this.clioConnectionRepository.findOne({
      where: { cell_id: cellId },
    });

    if (connection) {
      connection.access_token = encryptedAccessToken;
      connection.refresh_token = encryptedRefreshToken;
      connection.expires_at = expiresAt;
    } else {
      connection = this.clioConnectionRepository.create({
        cell_id: cellId,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
      });
    }

    return this.clioConnectionRepository.save(connection);
  }

  /**
   * Get decrypted access token for cell
   */
  async getAccessToken(cellId: string): Promise<string> {
    const connection = await this.clioConnectionRepository.findOne({
      where: { cell_id: cellId },
    });

    if (!connection) {
      throw new Error("Clio connection not found for this cell");
    }

    // Check if token expired
    if (new Date() >= connection.expires_at) {
      // Refresh token
      await this.refreshAccessToken(cellId);
      return this.getAccessToken(cellId);
    }

    return this.decrypt(connection.access_token);
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(cellId: string): Promise<void> {
    const connection = await this.clioConnectionRepository.findOne({
      where: { cell_id: cellId },
    });

    if (!connection) {
      throw new Error("Clio connection not found");
    }

    const refreshToken = this.decrypt(connection.refresh_token);

    const tokenResponse = await axios.post("https://app.clio.com/oauth/token", {
      client_id: this.clioClientId,
      client_secret: this.clioClientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const {
      access_token,
      refresh_token: new_refresh_token,
      expires_in,
    } = tokenResponse.data;

    connection.access_token = this.encrypt(access_token);
    connection.refresh_token = this.encrypt(new_refresh_token);
    connection.expires_at = new Date(Date.now() + expires_in * 1000);

    await this.clioConnectionRepository.save(connection);
  }

  /**
   * Make API call to Clio
   */
  async callClioApi(
    cellId: string,
    endpoint: string,
    method = "GET",
    data?: any,
  ): Promise<any> {
    const accessToken = await this.getAccessToken(cellId);

    const response = await axios({
      method,
      url: `https://app.clio.com/api/v4/${endpoint}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      data,
    });

    return response.data;
  }

  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
  }

  private decrypt(ciphertext: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
