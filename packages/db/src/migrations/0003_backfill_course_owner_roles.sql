-- ADR-0006: course authority moves from courses.creator_id onto
-- course_teachers.role. Every existing course must end up with exactly one
-- OWNER, and 0002 defaulted every row to TEACHER.

-- The creator, where they are already on the roster, becomes the owner.
UPDATE "course_teachers" ct
SET "role" = 'OWNER'
FROM "courses" c
WHERE c."id" = ct."course_id"
  AND c."creator_id" = ct."teacher_id";
--> statement-breakpoint

-- A creator who was never added to the roster still owns their course.
INSERT INTO "course_teachers" ("course_id", "teacher_id", "role")
SELECT c."id", c."creator_id", 'OWNER'
FROM "courses" c
WHERE NOT EXISTS (
  SELECT 1
  FROM "course_teachers" ct
  WHERE ct."course_id" = c."id"
    AND ct."teacher_id" = c."creator_id"
)
ON CONFLICT ("course_id", "teacher_id") DO UPDATE SET "role" = 'OWNER';
--> statement-breakpoint

-- Any course still without an owner — creator deleted, roster rebuilt — gets
-- its longest-standing teacher promoted, so no course is left unaccountable.
UPDATE "course_teachers" ct
SET "role" = 'OWNER'
WHERE ct."ctid" IN (
  SELECT DISTINCT ON (inner_ct."course_id") inner_ct."ctid"
  FROM "course_teachers" inner_ct
  WHERE NOT EXISTS (
    SELECT 1
    FROM "course_teachers" owned
    WHERE owned."course_id" = inner_ct."course_id"
      AND owned."role" = 'OWNER'
  )
  ORDER BY inner_ct."course_id", inner_ct."assigned_at" ASC
);
