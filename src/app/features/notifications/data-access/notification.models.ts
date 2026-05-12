export interface NotificationItem {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  read: boolean;
  referenceId?: number | null;
  referenceType?: string | null;
  createdAt: string;
  readAt?: string | null;
}

export interface UnreadCountResponse {
  userId: number;
  unreadCount: number;
}
