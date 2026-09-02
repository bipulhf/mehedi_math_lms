import { asc, db, eq, isNull, studentProfiles, teacherProfiles, users } from "@genex/db";
import { normalizeBdPhoneE164 } from "@genex/shared";

/**
 * Copies the phone number people already gave us onto `users.phone_number`,
 * so an existing account can be signed into with a code instead of a password.
 *
 * Two things it deliberately does not do:
 *
 * - It does not mark anything verified. A profile field is a number somebody
 *   typed, not one we have ever delivered to; `phone_number_verified` stays
 *   false and the first OTP is what turns it true.
 * - It does not touch `guardian_phone`. That is a parent's handset, and it must
 *   not become a way into the student's account.
 *
 * `users.phone_number` is unique. Shared numbers are common here -- siblings,
 * a family phone -- so the first claim wins and the rest are reported and left
 * alone rather than failing the run. Oldest account first, so re-running picks
 * the same winner. Idempotent: it only looks at rows with no number yet.
 */

interface CandidateRow {
  createdAt: Date;
  id: string;
  profilePhone: string | null;
}

async function findCandidates(): Promise<readonly CandidateRow[]> {
  return db
    .select({
      createdAt: users.createdAt,
      id: users.id,
      // Coalesced in TypeScript rather than SQL so the two roles stay legible;
      // a user is a student or a teacher, never both.
      profilePhone: studentProfiles.phone,
      teacherPhone: teacherProfiles.phone
    })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
    .where(isNull(users.phoneNumber))
    .orderBy(asc(users.createdAt))
    .then((rows) =>
      rows.map((row) => ({
        createdAt: row.createdAt,
        id: row.id,
        profilePhone: row.profilePhone ?? row.teacherPhone
      }))
    );
}

async function isNumberTaken(phoneE164: string): Promise<boolean> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phoneNumber, phoneE164))
    .limit(1);

  return rows.length > 0;
}

async function backfillUserPhoneNumbers(): Promise<void> {
  const candidates = await findCandidates();

  if (candidates.length === 0) {
    console.log("Every user already has a phone number. Nothing to do.");
    return;
  }

  console.log(`Checking ${String(candidates.length)} users without a phone number...`);

  let filled = 0;
  let missing = 0;
  let unreadable = 0;
  let duplicate = 0;

  for (const candidate of candidates) {
    const raw = candidate.profilePhone?.trim();

    if (!raw || raw.length === 0) {
      missing++;
      continue;
    }

    const phoneE164 = normalizeBdPhoneE164(raw);

    if (!phoneE164) {
      unreadable++;
      console.log(`Skipped ${candidate.id}: "${raw}" is not a Bangladesh mobile number`);
      continue;
    }

    if (await isNumberTaken(phoneE164)) {
      duplicate++;
      console.log(`Skipped ${candidate.id}: ${phoneE164} already belongs to another account`);
      continue;
    }

    await db
      .update(users)
      .set({ phoneNumber: phoneE164, updatedAt: new Date() })
      .where(eq(users.id, candidate.id));

    filled++;
    console.log(`Updated ${candidate.id} -> ${phoneE164}`);
  }

  console.log(
    `Phone backfill completed. Filled ${String(filled)}, no number on file ${String(
      missing
    )}, unreadable ${String(unreadable)}, already claimed ${String(duplicate)}.`
  );
}

await backfillUserPhoneNumbers();
