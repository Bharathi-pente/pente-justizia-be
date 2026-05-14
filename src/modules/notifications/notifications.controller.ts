import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { KeycloakAuthGuard } from "../../common/guards/keycloak-auth.guard";
import { RequestWithUser } from "../../common/types/request-with-user.types";

@Controller("notifications")
@UseGuards(KeycloakAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications
   * Get user's notifications
   */
  @Get()
  async findAll(
    @Request() req: RequestWithUser,
    @Query("unreadOnly") unreadOnly?: string,
  ) {
    const userId = req.user.sub;
    const notifications = await this.notificationsService.findByUserId(
      userId,
      unreadOnly === "true",
    );

    return {
      success: true,
      data: notifications,
      meta: {
        total: notifications.length,
      },
    };
  }

  /**
   * GET /notifications/unread-count
   * Get unread notification count
   */
  @Get("unread-count")
  async getUnreadCount(@Request() req: RequestWithUser) {
    const userId = req.user.sub;
    const count = await this.notificationsService.getUnreadCount(userId);

    return {
      success: true,
      data: { count },
    };
  }

  /**
   * PATCH /notifications/:id/read
   * Mark notification as read
   */
  @Patch(":id/read")
  async markAsRead(@Param("id") id: string, @Request() req: RequestWithUser) {
    const userId = req.user.sub;
    await this.notificationsService.markAsRead(id, userId);

    return {
      success: true,
      message: "Notification marked as read",
    };
  }

  /**
   * PATCH /notifications/mark-all-read
   * Mark all notifications as read
   */
  @Patch("mark-all-read")
  async markAllAsRead(@Request() req: RequestWithUser) {
    const userId = req.user.sub;
    await this.notificationsService.markAllAsRead(userId);

    return {
      success: true,
      message: "All notifications marked as read",
    };
  }
}
