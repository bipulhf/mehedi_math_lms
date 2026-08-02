---
status: accepted
---

# Course authority lives on the join table, not on creatorId

`course_teachers` gains a `role` of `OWNER` or `TEACHER`. Owners control who teaches a course, its price,
and its place in the catalog; teachers work on its content. The creating teacher becomes the first owner,
and a course is never left without one.

## Context

`course_teachers` was `(courseId, teacherId, assignedAt)` with no role, and `course-service.ts:134`
granted the creator and every assigned teacher identical rights:

```ts
const isAssignedTeacher = course.teachers.some((teacher) => teacher.id === currentUserId);
const isCreator = course.creator.id === currentUserId;
if (!isAssignedTeacher && !isCreator) { throw new ForbiddenError(...); }
```

`POST /courses/:id/teachers` is guarded by that same check, so a teacher invited to help with one chapter
could rewrite the course, withdraw it, and remove the original creator from it. Nothing distinguished the
person who built a course from someone added last week.

`courses.creatorId` could not be used to fix this on its own: it records who typed the course into
existence, which is a historical fact and cannot change. A teacher who leaves the academy can never hand
their courses to a colleague if authority is pinned to that column.

## Decision

- `course_teachers.role` is `OWNER | TEACHER`. The creator is seeded as the first `OWNER`.
- Owners manage the teacher roster, price, submission for approval, withdrawal, and restoration.
- Teachers manage chapters, lectures, materials, tests, and notices.
- Removing the last remaining owner is refused, so a course always has someone accountable for it.
- `creatorId` remains as a historical record and stops being load-bearing for permissions.

## Considered options

- **Split the guard, keep authority on `creatorId`.** Rejected despite needing no migration: it leaves a
  course strandable when its creator leaves, recoverable only by an Admin.
- **Treat co-teachers as full peers and document it.** Rejected: any co-teacher could remove any other,
  including the course's author, with no audit trail.

## Consequences

- Ownership becomes transferable, which is the capability the previous model could not express at all.
- Existing rows need backfilling: every `course_teachers` row for a course's `creatorId` becomes `OWNER`,
  the rest `TEACHER`. Courses whose creator is not in the join table need one inserted.
- Admins continue to bypass these checks entirely.
