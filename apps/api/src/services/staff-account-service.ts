import { generateUniqueSlug } from "@mma/shared";
import { createPasswordHash } from "@mma/auth/server";

import { queues } from "@/lib/queues";
import { StaffAccountRepository, type StaffRole } from "@/repositories/staff-account-repository";
import { ConflictError } from "@/utils/errors";

export interface CreateStaffAccountRequest {
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

  public async createStaffAccount(input: CreateStaffAccountRequest): Promise<CreatedStaffAccount> {
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

    await queues.email.add("staff-account-invite", {
      email: createdStaffAccount.email,
      name: createdStaffAccount.name,
      role: createdStaffAccount.role,
      temporaryPassword
    });

    return {
      ...createdStaffAccount,
      temporaryPassword
    };
  }
}
