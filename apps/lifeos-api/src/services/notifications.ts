import type { NotificationItem } from "@lifeos/shared";

/** Notifications may later originate from independent OSs. */
export interface NotificationSource {
  readonly id: string;
  list(userId: string): Promise<NotificationItem[]>;
}

export class CompositeNotificationSource implements NotificationSource {
  readonly id = "composite";

  constructor(private readonly sources: NotificationSource[]) {}

  async list(userId: string): Promise<NotificationItem[]> {
    const batches = await Promise.all(
      this.sources.map(async (source) => {
        try {
          return await source.list(userId);
        } catch {
          return [] as NotificationItem[];
        }
      }),
    );
    return batches
      .flat()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
}
