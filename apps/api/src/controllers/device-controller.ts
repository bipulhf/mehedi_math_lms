import type { Context } from "hono";
import type { DeviceConflictStatus } from "@genex/shared";
import { deviceIdHeader, deviceIdSchema, devicePlatformHeader, devicePlatformSchema } from "@genex/shared";

import type { DeviceService } from "@/services/device-service";
import type { AppBindings } from "@/types/app-bindings";
import { paginated, success } from "@/utils/response";

export class DeviceController {
  public constructor(private readonly deviceService: DeviceService) {}

  public async listConflicts(
    context: Context<AppBindings>,
    query: Parameters<DeviceService["listConflicts"]>[0]
  ): Promise<Response> {
    const result = await this.deviceService.listConflicts(query);

    return paginated(context, result.items, {
      limit: query.limit,
      page: query.page,
      pages: Math.max(1, Math.ceil(result.total / query.limit)),
      total: result.total
    });
  }

  public async listUserDevices(context: Context<AppBindings>, userId: string): Promise<Response> {
    const devices = await this.deviceService.listUserDevices(userId);

    return success(context, devices);
  }

  public async resolveConflict(
    context: Context<AppBindings>,
    input: {
      conflictId: string;
      note?: string | undefined;
      reviewerId: string;
      status: DeviceConflictStatus;
    }
  ): Promise<{ response: Response; userId: string }> {
    const userId = await this.deviceService.resolveConflict(input);

    return { response: success(context, { id: input.conflictId, status: input.status }), userId };
  }

  /**
   * The signed-in app telling the API which device is holding this session.
   * Only fills a blank -- a session that already names a device is not
   * something a later request gets to rename.
   */
  public async claimSession(context: Context<AppBindings>): Promise<Response> {
    const session = context.get("authSession");
    const user = context.get("authUser");
    const parsedDeviceId = deviceIdSchema.safeParse(context.req.header(deviceIdHeader) ?? "");
    const parsedPlatform = devicePlatformSchema.safeParse(
      context.req.header(devicePlatformHeader) ?? ""
    );

    if (!session || !user || !parsedDeviceId.success) {
      return success(context, { claimed: false });
    }

    await this.deviceService.claimSession({
      deviceId: parsedDeviceId.data,
      ipAddress: context.req.header("x-forwarded-for") ?? null,
      platform: parsedPlatform.success ? parsedPlatform.data : "unknown",
      sessionId: session.id,
      userAgent: context.req.header("user-agent") ?? null,
      userId: user.id
    });

    return success(context, { claimed: true });
  }

  public async setMultiDeviceAllowed(
    context: Context<AppBindings>,
    userId: string,
    allowed: boolean
  ): Promise<Response> {
    await this.deviceService.setMultiDeviceAllowed(userId, allowed);

    return success(context, { multiDeviceAllowed: allowed, userId });
  }

  public async resetSessions(context: Context<AppBindings>, userId: string): Promise<Response> {
    await this.deviceService.resetSessions(userId);

    return success(context, { userId });
  }
}
