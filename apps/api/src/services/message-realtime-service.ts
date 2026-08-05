import Redis from "ioredis";
import type { WSContext } from "hono/ws";

import { logger } from "@/lib/logger";

export interface MessageRealtimeEvent {
  conversationId: string;
  data: Record<string, string | boolean | readonly string[] | null>;
  type: "message:new" | "message:read" | "presence:update" | "typing:start" | "typing:stop";
  userIds?: readonly string[];
}

const MESSAGE_REALTIME_CHANNEL = "genex:messages:events";
const PRESENCE_HASH_KEY = "genex:messages:presence";

interface LocalSocketEntry {
  connectionId: string;
}

/**
 * Message delivery and presence.
 *
 * With Redis, an event is published to a channel every process subscribes to,
 * so a message reaches a reader connected to a different instance. Without it
 * (`redisUrl` is null), `publish` hands the event straight to `deliver` — which
 * only ever wrote to this process's sockets anyway, so with one process the
 * behaviour is identical. Two processes and no Redis would mean one reader
 * never sees the other's message, which is why ADR-0015 makes
 * `REDIS_ENABLED=false` a single-process arrangement.
 *
 * Presence is the piece that is easy to miss: it is read on five paths in
 * `message-service.ts`, so it is not fan-out, it is state. In local mode it
 * lives in a `Map` — which for one process is not an approximation but the
 * whole truth, and it cannot be left stale by a crash the way the Redis hash
 * can.
 */
export class MessageRealtimeService {
  private readonly socketsByUserId = new Map<string, Map<string, WSContext<undefined>>>();

  private readonly publisher: Redis | null;

  private readonly subscriber: Redis | null;

  /** Connection counts per user, for a deployment with no Redis. */
  private readonly localPresence = new Map<string, number>();

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

    const onlineCount = await this.incrementPresence(userId, 1);

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

    const onlineCount = await this.incrementPresence(userId, -1);

    if (onlineCount <= 0) {
      await this.clearPresence(userId);
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
    if (this.publisher === null) {
      // One process, so the sockets this event is for are the ones already
      // held here. A round trip through Redis would deliver to the same map.
      this.deliver(event);

      return;
    }

    await this.publisher.publish(MESSAGE_REALTIME_CHANNEL, JSON.stringify(event));
  }

  private async incrementPresence(userId: string, delta: number): Promise<number> {
    if (this.publisher === null) {
      const next = (this.localPresence.get(userId) ?? 0) + delta;

      this.localPresence.set(userId, next);

      return next;
    }

    return this.publisher.hincrby(PRESENCE_HASH_KEY, userId, delta);
  }

  private async clearPresence(userId: string): Promise<void> {
    if (this.publisher === null) {
      this.localPresence.delete(userId);

      return;
    }

    await this.publisher.hdel(PRESENCE_HASH_KEY, userId);
  }

  /**
   * Every connection this process is still holding, released as if each one
   * had closed normally. Call this before the process exits: nothing else
   * decrements the Redis presence count for a socket that vanishes with the
   * process rather than through `onClose`/`onError`, so a restart without
   * this leaves every user who was connected at the time stuck "online"
   * until a human clears `genex:messages:presence` by hand.
   */
  public async releaseAllConnections(): Promise<void> {
    const releases = [...this.socketsByUserId.entries()].flatMap(([userId, sockets]) =>
      [...sockets.keys()].map((connectionId) => this.unregisterConnection(userId, connectionId))
    );

    await Promise.allSettled(releases);
  }

  public async getOnlineUserIds(userIds: readonly string[]): Promise<ReadonlySet<string>> {
    if (this.publisher === null) {
      return new Set(userIds.filter((userId) => (this.localPresence.get(userId) ?? 0) > 0));
    }

    const publisher = this.publisher;
    const entries = await Promise.all(
      userIds.map(async (userId) => ({
        count: await publisher.hget(PRESENCE_HASH_KEY, userId),
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
    if (this.subscriber === null || this.publisher === null) {
      return;
    }

    try {
      await this.subscriber.unsubscribe(MESSAGE_REALTIME_CHANNEL);
    } catch (error) {
      logger.warn({ error }, "Failed to unsubscribe message realtime channel");
    }

    await Promise.allSettled([this.publisher.quit(), this.subscriber.quit()]);
  }
}
