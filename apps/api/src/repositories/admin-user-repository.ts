import type { SQL } from "@mma/db";
import {
  and,
  bugReports,
  count,
  db,
  desc,
  eq,
  ilike,
  or,
  sessions,
  studentProfiles,
  teacherProfiles,
  users
} from "@mma/db";
import type { UserRole } from "@mma/shared";

export interface AdminUsersQuery {
  limit: number;
  page: number;
  role?: UserRole | undefined;
  search?: string | undefined;
  status: "all" | "active" | "inactive";
}

export interface AdminUserListRecord {
  createdAt: Date;
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  profileCompleted: boolean;
  role: UserRole;
}

export interface UserSessionActivityRecord {
  createdAt: Date;
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface UserBugActivityRecord {
  createdAt: Date;
  id: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  title: string;
}

export interface AdminUserDetailRecord extends AdminUserListRecord {
  bugReports: readonly UserBugActivityRecord[];
  image: string | null;
  sessionHistory: readonly UserSessionActivityRecord[];
  slug: string | null;
  studentProfile: {
    classOrGrade: string | null;
    institution: string | null;
    phone: string | null;
  } | null;
  teacherProfile: {
    phone: string | null;
    qualifications: string | null;
    specializations: string | null;
  } | null;
}

export interface UpdateAdminUserInput {
  email?: string | undefined;
  name?: string | undefined;
  role?: "STUDENT" | "TEACHER" | "ACCOUNTANT" | undefined;
}

function buildUserFilters(query: AdminUsersQuery): SQL<unknown> | undefined {
  const filters: Array<SQL<unknown>> = [];

  if (query.role) {
    filters.push(eq(users.role, query.role));
  }

  if (query.status === "active") {
    filters.push(eq(users.isActive, true));
  }

  if (query.status === "inactive") {
    filters.push(eq(users.isActive, false));
  }

  if (query.search && query.search.trim().length > 0) {
    const searchTerm = `%${query.search.trim()}%`;
    const searchFilter = or(ilike(users.name, searchTerm), ilike(users.email, searchTerm));

    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  if (filters.length === 0) {
    return undefined;
  }

  return filters.length === 1 ? filters[0] : and(...filters);
}

export class AdminUserRepository {
  public async listUsers(
    query: AdminUsersQuery
  ): Promise<{ items: readonly AdminUserListRecord[]; total: number }> {
    const whereClause = buildUserFilters(query);
    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        createdAt: users.createdAt,
        email: users.email,
        id: users.id,
        isActive: users.isActive,
        name: users.name,
        profileCompleted: users.profileCompleted,
        role: users.role
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(query.limit)
      .offset(offset);

    const totalRows = await db
      .select({ value: count() })
      .from(users)
      .where(whereClause);

    return {
      items: rows.map((row) => ({
        ...row,
        role: row.role as UserRole
      })),
      total: totalRows[0]?.value ?? 0
    };
  }

  public async findById(userId: string): Promise<AdminUserDetailRecord | null> {
    const user = await db.query.users.findFirst({
      columns: {
        createdAt: true,
        email: true,
        id: true,
        image: true,
        isActive: true,
        name: true,
        profileCompleted: true,
        role: true,
        slug: true
      },
      where: eq(users.id, userId),
      with: {
        bugReports: {
          columns: {
            createdAt: true,
            id: true,
            priority: true,
            status: true,
            title: true
          },
          orderBy: (table, operators) => [operators.desc(table.createdAt)],
          limit: 10
        },
        sessions: {
          columns: {
            createdAt: true,
            id: true,
            ipAddress: true,
            userAgent: true
          },
          orderBy: (table, operators) => [operators.desc(table.createdAt)],
          limit: 10
        },
        studentProfile: {
          columns: {
            classOrGrade: true,
            institution: true,
            phone: true
          }
        },
        teacherProfile: {
          columns: {
            phone: true,
            qualifications: true,
            specializations: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    return {
      bugReports: user.bugReports.map((bugReport) => ({
        ...bugReport,
        priority: bugReport.priority as "LOW" | "MEDIUM" | "HIGH",
        status: bugReport.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
      })),
      createdAt: user.createdAt,
      email: user.email,
      id: user.id,
      image: user.image,
      isActive: user.isActive,
      name: user.name,
      profileCompleted: user.profileCompleted,
      role: user.role as UserRole,
      sessionHistory: user.sessions,
      slug: user.slug,
      studentProfile: user.studentProfile,
      teacherProfile: user.teacherProfile
    };
  }

  public async findByEmail(email: string): Promise<{ id: string } | null> {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return rows[0] ?? null;
  }

  public async updateUser(userId: string, input: UpdateAdminUserInput): Promise<AdminUserListRecord | null> {
    const updatedRows = await db
      .update(users)
      .set({
        email: input.email,
        name: input.name,
        role: input.role,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        createdAt: users.createdAt,
        email: users.email,
        id: users.id,
        isActive: users.isActive,
        name: users.name,
        profileCompleted: users.profileCompleted,
        role: users.role
      });

    const updatedUser = updatedRows[0];

    if (!updatedUser) {
      return null;
    }

    return {
      ...updatedUser,
      role: updatedUser.role as UserRole
    };
  }

  public async updateUserStatus(
    userId: string,
    isActive: boolean,
    banReason: string | null
  ): Promise<AdminUserListRecord | null> {
    const updatedRows = await db
      .update(users)
      .set({
        banExpires: null,
        banReason,
        banned: !isActive,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        createdAt: users.createdAt,
        email: users.email,
        id: users.id,
        isActive: users.isActive,
        name: users.name,
        profileCompleted: users.profileCompleted,
        role: users.role
      });

    const updatedUser = updatedRows[0];

    if (!updatedUser) {
      return null;
    }

    return {
      ...updatedUser,
      role: updatedUser.role as UserRole
    };
  }

  public async softDeleteUser(userId: string): Promise<AdminUserListRecord | null> {
    return this.updateUserStatus(userId, false, "Deleted by admin");
  }
}
