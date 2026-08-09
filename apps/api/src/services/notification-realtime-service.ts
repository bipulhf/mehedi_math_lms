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

/**
 * Notification fan-out. Same arrangement as `MessageRealtimeService`: with
 * Redis an event reaches every process, without it `publish` delivers to this
 * one's sockets — which is all `deliver` ever wrote to. See ADR-0015 for why
 * that makes `REDIS_ENABLED=false` a single-process arrangement.
 */
export class NotificationRealtimeService {
  private readonly socketsByUserId = new Map<string, Map<string, WSContext<undefined>>>();

  private readonly publisher: Redis | null;

  private readonly subscriber: Redis | null;

  public constructor(redisUrl: string | null) {
    if (redisUrl === null) {
      this.publisher = null;
      this.subscriber = null;

      return;
    }

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
    if (this.subscriber === null) {
      return;
    }

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
    if (this.publisher === null) {
      this.deliver(event);

      return;
    }

    await this.publisher.publish(CHANNEL, JSON.stringify(event));
  }

  public async close(): Promise<void> {
    if (this.subscriber === null || this.publisher === null) {
      return;
    }

    try {
      await this.subscriber.unsubscribe(CHANNEL);
    } catch (error) {
      logger.warn({ error }, "Failed to unsubscribe notifications channel");
    }

    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}
