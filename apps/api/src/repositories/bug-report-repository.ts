import type { SQL } from "@mma/db";
import { and, bugReports, count, db, desc, eq, or, users } from "@mma/db";

export interface CreateBugReportInput {
  description: string;
  screenshotUrl: string | null;
  title: string;
  userId: string;
}

export interface BugReportQuery {
  limit: number;
  page: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | undefined;
}

export interface BugReportRecord {
  adminNotes: string | null;
  createdAt: Date;
  description: string;
  id: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  screenshotUrl: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  title: string;
  updatedAt: Date;
  user: {
    email: string;
    id: string;
    name: string;
    role: "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN";
  };
}

export interface UpdateBugReportInput {
  adminNotes?: string | null | undefined;
  priority?: "LOW" | "MEDIUM" | "HIGH" | undefined;
  resolvedAt?: Date | null | undefined;
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | undefined;
}

function buildBugFilters(query: BugReportQuery): SQL<unknown> | undefined {
  const filters: Array<SQL<unknown>> = [];

  if (query.priority) {
    filters.push(eq(bugReports.priority, query.priority));
  }

  if (query.status) {
    filters.push(eq(bugReports.status, query.status));
  }

  if (filters.length === 0) {
    return undefined;
  }

  return filters.length === 1 ? filters[0] : and(...filters);
}

function mapBugReportRecord(
  row:
    | {
        adminNotes: string | null;
        createdAt: Date;
        description: string;
        id: string;
        priority: string;
        screenshotUrl: string | null;
        status: string;
        title: string;
        updatedAt: Date;
        userEmail: string;
        userId: string;
        userName: string;
        userRole: string;
      }
    | undefined
): BugReportRecord | null {
  if (!row) {
    return null;
  }

  return {
    adminNotes: row.adminNotes,
    createdAt: row.createdAt,
    description: row.description,
    id: row.id,
    priority: row.priority as "LOW" | "MEDIUM" | "HIGH",
    screenshotUrl: row.screenshotUrl,
    status: row.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
    title: row.title,
    updatedAt: row.updatedAt,
    user: {
      email: row.userEmail,
      id: row.userId,
      name: row.userName,
      role: row.userRole as "STUDENT" | "TEACHER" | "ACCOUNTANT" | "ADMIN"
    }
  };
}

export class BugReportRepository {
  public async create(input: CreateBugReportInput): Promise<BugReportRecord> {
    const rows = await db
      .insert(bugReports)
      .values({
        description: input.description,
        screenshotUrl: input.screenshotUrl,
        title: input.title,
        userId: input.userId
      })
      .returning({
        adminNotes: bugReports.adminNotes,
        createdAt: bugReports.createdAt,
        description: bugReports.description,
        id: bugReports.id,
        priority: bugReports.priority,
        screenshotUrl: bugReports.screenshotUrl,
        status: bugReports.status,
        title: bugReports.title,
        updatedAt: bugReports.updatedAt,
        userId: bugReports.userId
      });

    const createdBug = rows[0];

    if (!createdBug) {
      throw new Error("Failed to create bug report");
    }

    const createdWithUser = await this.findById(createdBug.id);

    if (!createdWithUser) {
      throw new Error("Failed to resolve created bug report");
    }

    return createdWithUser;
  }

  public async listMine(userId: string): Promise<readonly BugReportRecord[]> {
    const rows = await db
      .select({
        adminNotes: bugReports.adminNotes,
        createdAt: bugReports.createdAt,
        description: bugReports.description,
        id: bugReports.id,
        priority: bugReports.priority,
        screenshotUrl: bugReports.screenshotUrl,
        status: bugReports.status,
        title: bugReports.title,
        updatedAt: bugReports.updatedAt,
        userEmail: users.email,
        userId: users.id,
        userName: users.name,
        userRole: users.role
      })
      .from(bugReports)
      .innerJoin(users, eq(bugReports.userId, users.id))
      .where(eq(bugReports.userId, userId))
      .orderBy(desc(bugReports.createdAt));

    return rows
      .map((row) => mapBugReportRecord(row))
      .filter((row): row is BugReportRecord => row !== null);
  }

  public async listAll(
    query: BugReportQuery
  ): Promise<{ items: readonly BugReportRecord[]; total: number }> {
    const whereClause = buildBugFilters(query);
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        adminNotes: bugReports.adminNotes,
        createdAt: bugReports.createdAt,
        description: bugReports.description,
        id: bugReports.id,
        priority: bugReports.priority,
        screenshotUrl: bugReports.screenshotUrl,
        status: bugReports.status,
        title: bugReports.title,
        updatedAt: bugReports.updatedAt,
        userEmail: users.email,
        userId: users.id,
        userName: users.name,
        userRole: users.role
      })
      .from(bugReports)
      .innerJoin(users, eq(bugReports.userId, users.id))
      .where(whereClause)
      .orderBy(desc(bugReports.createdAt))
      .limit(query.limit)
      .offset(offset);

    const totalRows = await db
      .select({ value: count() })
      .from(bugReports)
      .where(whereClause);

    return {
      items: rows
        .map((row) => mapBugReportRecord(row))
        .filter((row): row is BugReportRecord => row !== null),
      total: totalRows[0]?.value ?? 0
    };
  }

  public async findById(id: string): Promise<BugReportRecord | null> {
    const rows = await db
      .select({
        adminNotes: bugReports.adminNotes,
        createdAt: bugReports.createdAt,
        description: bugReports.description,
        id: bugReports.id,
        priority: bugReports.priority,
        screenshotUrl: bugReports.screenshotUrl,
        status: bugReports.status,
        title: bugReports.title,
        updatedAt: bugReports.updatedAt,
        userEmail: users.email,
        userId: users.id,
        userName: users.name,
        userRole: users.role
      })
      .from(bugReports)
      .innerJoin(users, eq(bugReports.userId, users.id))
      .where(eq(bugReports.id, id))
      .limit(1);

    return mapBugReportRecord(rows[0]);
  }

  public async update(id: string, input: UpdateBugReportInput): Promise<BugReportRecord | null> {
    const rows = await db
      .update(bugReports)
      .set({
        adminNotes: input.adminNotes,
        priority: input.priority,
        resolvedAt: input.resolvedAt,
        status: input.status,
        updatedAt: new Date()
      })
      .where(eq(bugReports.id, id))
      .returning({ id: bugReports.id });

    if (!rows[0]) {
      return null;
    }

    return this.findById(id);
  }
}
