import Redis from "ioredis";
import type { WSContext } from "hono/ws";

import { logger } from "@/lib/logger";

export interface NotificationRealtimeEvent {
  data: Record<string, string | boolean | readonly string[] | null>;
  type: "notification:new" | "notification:read" | "notification:read-all";
  userIds?: readonly string[];
}

const CHANNEL = "mma:notifications:events";

interface LocalRegistration {
  connectionId: string;
}

export class NotificationRealtimeService {
  private readonly socketsByUserId = new Map<string, Map<string, WSContext<undefined>>>();

  private readonly publisher: Redis;

  private readonly subscriber: Redis;

  public constructor(redisUrl: string) {
    this.publisher = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null
    });
    this.subscriber = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null
    });
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    this.subscriber.on("message", (_channel, payload) => {
      const event = JSON.parse(payload) as NotificationRealtimeEvent;
      this.deliver(event);
    });

    await this.subscriber.subscribe(CHANNEL);
  }

  private deliver(event: NotificationRealtimeEvent): void {
    const serialized = JSON.stringify(event);

    if (event.userIds && event.userIds.length > 0) {
      for (const userId of event.userIds) {
        const sockets = this.socketsByUserId.get(userId);

        if (!sockets) {
          continue;
        }

        for (const socket of sockets.values()) {
          socket.send(serialized);
        }
      }

      return;
    }

    for (const sockets of this.socketsByUserId.values()) {
      for (const socket of sockets.values()) {
        socket.send(serialized);
      }
    }
  }

  public async registerConnection(userId: string, socket: WSContext<undefined>): Promise<LocalRegistration> {
    const connectionId = crypto.randomUUID();
    const currentSockets = this.socketsByUserId.get(userId) ?? new Map<string, WSContext<undefined>>();

    currentSockets.set(connectionId, socket);
    this.socketsByUserId.set(userId, currentSockets);

    return { connectionId };
  }

  public async unregisterConnection(userId: string, connectionId: string): Promise<void> {
    const currentSockets = this.socketsByUserId.get(userId);

    if (!currentSockets) {
      return;
    }

    currentSockets.delete(connectionId);

    if (currentSockets.size === 0) {
      this.socketsByUserId.delete(userId);
    }
  }

  public async publish(event: NotificationRealtimeEvent): Promise<void> {
    await this.publisher.publish(CHANNEL, JSON.stringify(event));
  }

  public async close(): Promise<void> {
    try {
      await this.subscriber.unsubscribe(CHANNEL);
    } catch (error) {
      logger.warn({ error }, "Failed to unsubscribe notifications channel");
    }

    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}
