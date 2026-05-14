import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "./entities/notification.entity";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  /**
   * Create a new notification
   */
  async create(
    userId: string,
    type: NotificationType,
    message: string,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      user_id: userId,
      type,
      message,
    });

    return this.notificationsRepository.save(notification);
  }

  /**
   * Get notifications for a user
   */
  async findByUserId(
    userId: string,
    unreadOnly = false,
  ): Promise<Notification[]> {
    const query = this.notificationsRepository
      .createQueryBuilder("notification")
      .where("notification.user_id = :userId", { userId })
      .andWhere("notification.is_deleted = :isDeleted", { isDeleted: false })
      .orderBy("notification.created_at", "DESC")
      .take(50);

    if (unreadOnly) {
      query.andWhere("notification.read = :read", { read: false });
    }

    return query.getMany();
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { id, user_id: userId },
      { read: true },
    );
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { user_id: userId, read: false },
      { read: true },
    );
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { user_id: userId, read: false, is_deleted: false },
    });
  }
}
