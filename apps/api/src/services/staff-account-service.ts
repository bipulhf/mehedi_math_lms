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

function createSlug(name: string): string {
  const normalizedName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = crypto.randomUUID().slice(0, 8);

  return `${normalizedName || "staff"}-${suffix}`;
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
      slug: createSlug(input.name)
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
