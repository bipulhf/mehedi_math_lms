import type { DeviceConflictStatus } from "@genex/shared";

import type { AuthSessionRepository } from "@/repositories/auth-session-repository";
import type {
  DeviceConflictQuery,
  DeviceConflictRecord,
  DeviceRepository,
  UserDeviceRecord
} from "@/repositories/device-repository";
import { NotFoundError } from "@/utils/errors";

/**
 * The administrator's side of the two-device limit: the queue of refused
 * sign-ins, the devices behind any one of them, and the two things that can be
 * done about it — lift the limit for that account, or sign it out everywhere
 * so the person can start again from the devices they still have.
 *
 * Disabling the account is deliberately not here. That already exists on the
 * user screen, and a suspected shared password is not a different kind of
 * deactivation to any other.
 */
export class DeviceService {
  public constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly authSessionRepository: AuthSessionRepository
  ) {}

  public async listConflicts(
    query: DeviceConflictQuery
  ): Promise<{ items: readonly DeviceConflictRecord[]; openCount: number; total: number }> {
    const [result, openCount] = await Promise.all([
      this.deviceRepository.listConflicts(query),
      this.deviceRepository.countOpenConflicts()
    ]);

    return { items: result.items, openCount, total: result.total };
  }

  public async listUserDevices(userId: string): Promise<readonly UserDeviceRecord[]> {
    return this.deviceRepository.listUserDevices(userId);
  }

  public async resolveConflict(input: {
    conflictId: string;
    note?: string | undefined;
    reviewerId: string;
    status: DeviceConflictStatus;
  }): Promise<string> {
    const userId = await this.deviceRepository.findConflictUserId(input.conflictId);

    if (userId === null) {
      throw new NotFoundError("Device conflict not found");
    }

    await this.deviceRepository.resolveConflict(input);

    return userId;
  }

  public async claimSession(input: Parameters<DeviceRepository["claimSession"]>[0]): Promise<void> {
    await this.deviceRepository.claimSession(input);
  }

  public async setMultiDeviceAllowed(userId: string, allowed: boolean): Promise<void> {
    await this.deviceRepository.setMultiDeviceAllowed(userId, allowed);
  }

  /**
   * Signs the account out everywhere. This is the way back in for somebody who
   * lost the phone one of their two slots is held by: the sessions go, the
   * device history stays, and the next two devices to sign in are theirs.
   */
  public async resetSessions(userId: string): Promise<void> {
    await this.authSessionRepository.deleteByUserId(userId);
  }
}
