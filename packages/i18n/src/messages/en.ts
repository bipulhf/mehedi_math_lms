import type { MessageKey } from "./bn";

/**
 * The English catalogue. Typed as a complete record of `MessageKey`, so a key
 * added to `bn.ts` and forgotten here fails the build.
 *
 * These are translations of the Bangla, not the other way round — keep the
 * same plain register and resist making them longer or more formal.
 */
export const en: Readonly<Record<MessageKey, string>> = {
  "action.back": "Back",
  "action.cancel": "Cancel",
  "action.clearFilters": "Clear filters",
  "action.collapseAll": "Collapse all",
  "action.enroll": "Enrol",
  "action.expandAll": "Expand all",
  "action.next": "Next",
  "action.nextPage": "Next page",
  "action.previousPage": "Previous page",
  "action.retry": "Try again",
  "action.save": "Save",
  "action.search": "Search",
  "action.seeLess": "See less",
  "action.seeMore": "See more",
  "action.showAll": "Show all",
  "action.viewAllCourses": "See all courses",
  "action.watchFreeClass": "Watch a free class",

  "brand.name": "Genex",

  "common.courses": "courses",
  "common.draft": "Draft",
  "common.free": "Free",
  "common.lessons": "classes",
  "common.published": "Published",
  "common.rating": "rating",
  "common.reviews": "reviews",
  "common.students": "students",
  "common.teachers": "teachers",
  "common.tests": "tests",

  "courses.resultCount": "Showing {shown} of {total} courses",

  "empty.courses": "No course matches that search",
  "empty.generic": "Nothing to show here yet",

  "footer.about": "Genex",
  "footer.address": "Address",
  "footer.copyright": "© {year} Genex",
  "footer.courses": "Courses",
  "footer.email": "Email",
  "footer.helpline": "Helpline",
  "footer.legal": "Legal",
  "footer.rights": "All rights reserved",

  "locale.label": "Language",

  "nav.categories": "Categories",
  "nav.courses": "Courses",
  "nav.enroll": "Enrol now",
  "nav.freeClasses": "Free classes",
  "nav.helpline": "HELPLINE",
  "nav.login": "Log in",
  "nav.teachers": "Teachers",

  "role.accountant": "Accountant",
  "role.admin": "Admin",
  "role.student": "Student",
  "role.teacher": "Teacher"
};
