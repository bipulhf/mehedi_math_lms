import Redis from "ioredis";
import type { WSContext } from "hono/ws";

import { logger } from "@/lib/logger";

export interface MessageRealtimeEvent {
  conversationId: string;
  data: Record<string, string | boolean | readonly string[] | null>;
  type: "message:new" | "message:read" | "presence:update" | "typing:start" | "typing:stop";
  userIds?: readonly string[];
}

const MESSAGE_REALTIME_CHANNEL = "mma:messages:events";
const PRESENCE_HASH_KEY = "mma:messages:presence";

interface LocalSocketEntry {
  connectionId: string;
}

export class MessageRealtimeService {
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
      const event = JSON.parse(payload) as MessageRealtimeEvent;
      this.deliver(event);
    });

    await this.subscriber.subscribe(MESSAGE_REALTIME_CHANNEL);
  }

  private deliver(event: MessageRealtimeEvent): void {
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

  public async registerConnection(
    userId: string,
    socket: WSContext<undefined>
  ): Promise<LocalSocketEntry> {
    const connectionId = crypto.randomUUID();
    const currentSockets = this.socketsByUserId.get(userId) ?? new Map<string, WSContext<undefined>>();

    currentSockets.set(connectionId, socket);
    this.socketsByUserId.set(userId, currentSockets);

    const onlineCount = await this.publisher.hincrby(PRESENCE_HASH_KEY, userId, 1);

    if (onlineCount === 1) {
      await this.publish({
        conversationId: "",
        data: {
          isOnline: true,
          userId
        },
        type: "presence:update"
      });
    }

    return {
      connectionId
    };
  }

  public async unregisterConnection(userId: string, connectionId: string): Promise<void> {
    const currentSockets = this.socketsByUserId.get(userId);

    if (currentSockets) {
      currentSockets.delete(connectionId);

      if (currentSockets.size === 0) {
        this.socketsByUserId.delete(userId);
      }
    }

    const onlineCount = await this.publisher.hincrby(PRESENCE_HASH_KEY, userId, -1);

    if (onlineCount <= 0) {
      await this.publisher.hdel(PRESENCE_HASH_KEY, userId);
      await this.publish({
        conversationId: "",
        data: {
          isOnline: false,
          userId
        },
        type: "presence:update"
      });
    }
  }

  public async publish(event: MessageRealtimeEvent): Promise<void> {
    await this.publisher.publish(MESSAGE_REALTIME_CHANNEL, JSON.stringify(event));
  }

  public async getOnlineUserIds(userIds: readonly string[]): Promise<ReadonlySet<string>> {
    const entries = await Promise.all(
      userIds.map(async (userId) => ({
        count: await this.publisher.hget(PRESENCE_HASH_KEY, userId),
        userId
      }))
    );

    return new Set(
      entries
        .filter((entry) => Number(entry.count ?? "0") > 0)
        .map((entry) => entry.userId)
    );
  }

  public async close(): Promise<void> {
    try {
      await this.subscriber.unsubscribe(MESSAGE_REALTIME_CHANNEL);
    } catch (error) {
      logger.warn({ error }, "Failed to unsubscribe message realtime channel");
    }

    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}
