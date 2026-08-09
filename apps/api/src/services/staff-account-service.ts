import { generateUniqueSlug } from "@mma/shared";
import { createPasswordHash, verifyPasswordHash } from "@mma/auth/server";

import type { StaffAccountRepository} from "@/repositories/staff-account-repository";
import { type StaffRole } from "@/repositories/staff-account-repository";
import { ConflictError, ForbiddenError, ValidationError } from "@/utils/errors";

export interface CreateStaffAccountRequest {
  /** The calling admin's own password. Required only to create an ADMIN. */
  confirmPassword?: string | undefined;
  email: string;
  name: string;
  role: StaffRole;
}

export interface CreatedStaffAccount {
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  profileCompleted: boolean;
  role: StaffRole;
  slug: string | null;
  temporaryPassword: string;
}

async function createUniqueStaffSlug(
  staffAccountRepository: StaffAccountRepository,
  name: string
): Promise<string> {
  return generateUniqueSlug(name, async (candidate) => {
    const existingUser = await staffAccountRepository.findBySlug(candidate);

    return existingUser !== null;
  });
}

function createTemporaryPassword(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export class StaffAccountService {
  public constructor(private readonly staffAccountRepository: StaffAccountRepository) {}

  /**
   * Minting an admin is the one act that requires the creating admin to prove
   * who they are again. A hijacked session should not be enough to create a
   * second, persistent administrator. ADR-0002.
   */
  private async requireReauthentication(
    currentUserId: string,
    confirmPassword: string | undefined
  ): Promise<void> {
    if (!confirmPassword) {
      throw new ValidationError("Confirm your password to create an admin", [
        {
          field: "confirmPassword",
          message: "Re-enter your own password to create an administrator"
        }
      ]);
    }

    const passwordHash = await this.staffAccountRepository.findPasswordHashByUserId(currentUserId);

    if (!passwordHash) {
      throw new ForbiddenError("Your account cannot create administrators");
    }

    const isCorrect = await verifyPasswordHash({
      hash: passwordHash,
      password: confirmPassword
    });

    if (!isCorrect) {
      throw new ForbiddenError("Password confirmation failed");
    }
  }

  public async createStaffAccount(
    input: CreateStaffAccountRequest,
    currentUserId: string
  ): Promise<CreatedStaffAccount> {
    if (input.role === "ADMIN") {
      await this.requireReauthentication(currentUserId, input.confirmPassword);
    }

    const existingUser = await this.staffAccountRepository.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictError("A user with this email already exists");
    }

    const temporaryPassword = createTemporaryPassword();
    const passwordHash = await createPasswordHash(temporaryPassword);
    const createdStaffAccount = await this.staffAccountRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      slug: await createUniqueStaffSlug(this.staffAccountRepository, input.name.trim())
    });

    // No invite is enqueued. The `email` queue has no worker and no transport
    // is installed, so the job only parked a plaintext password in Redis
    // indefinitely. The temporary password reaches the new account holder via
    // this response, out of band, until an email worker exists. ADR-0002.
    return {
      ...createdStaffAccount,
      temporaryPassword
    };
  }
}
