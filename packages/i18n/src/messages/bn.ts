/**
 * The Bangla catalogue, and the source of truth for what keys exist.
 * `en.ts` is typed against it, so adding a key here without adding it there is
 * a compile error rather than a string that silently falls back.
 *
 * Register: plain and spoken, informal "তুমি", short sentences, no marketing
 * bravado. See DESIGN.md §10.
 *
 * This grows one migration phase at a time — screens add the keys they need
 * as they are rebuilt. It is not meant to be complete ahead of them.
 */
export const bn = {
  "action.back": "আগের ধাপ",
  "action.cancel": "বাদ দাও",
  "action.clearFilters": "ফিল্টার মুছে দাও",
  "action.collapseAll": "সব বন্ধ কর",
  "action.enroll": "ভর্তি হও",
  "action.expandAll": "সব খুলে দাও",
  "action.next": "পরের ধাপ",
  "action.nextPage": "পরের পাতা",
  "action.previousPage": "আগের পাতা",
  "action.retry": "আবার চেষ্টা কর",
  "action.save": "সেভ কর",
  "action.search": "খোঁজ",
  "action.seeLess": "কম দেখাও",
  "action.seeMore": "আরও দেখাও",
  "action.showAll": "সবগুলো দেখাও",
  "action.viewAllCourses": "সব কোর্স দেখ",
  "action.watchFreeClass": "একটা ফ্রি ক্লাস দেখ",

  "auth.backHome": "হোমে ফিরে যাও",

  "brand.name": "জেনেক্স",

  "common.courses": "কোর্স",
  "common.draft": "ড্রাফট",
  "common.free": "ফ্রি",
  "common.lessons": "ক্লাস",
  "common.published": "প্রকাশিত",
  "common.rating": "রেটিং",
  "common.reviews": "রিভিউ",
  "common.students": "শিক্ষার্থী",
  "common.teachers": "শিক্ষক",
  "common.tests": "পরীক্ষা",

  "common.close": "বন্ধ কর",
  "courses.resultCount": "{shown}টি কোর্স দেখানো হচ্ছে · মোট {total}টি",

  "empty.courses": "এই নামে কোনো কোর্স পাওয়া যায়নি",
  "empty.generic": "এখানে দেখানোর মতো কিছু নেই",

  "field.hidePassword": "লুকাও",
  "field.showPassword": "দেখাও",

  "footer.about": "জেনেক্স",
  "footer.address": "ঠিকানা",
  "footer.copyright": "© {year} জেনেক্স",
  "footer.courses": "কোর্স",
  "footer.email": "ইমেইল",
  "footer.helpline": "হেল্পলাইন",
  "footer.legal": "নিয়ম",
  "footer.rights": "সর্বস্বত্ব সংরক্ষিত",

  "footer.privacy": "গোপনীয়তা",
  "footer.support": "সাহায্য",
  "footer.terms": "শর্তাবলি",

  "locale.label": "ভাষা",

  "nav.dashboard": "ড্যাশবোর্ড",
  "nav.categories": "ক্যাটাগরি",
  "nav.courses": "কোর্স",
  "nav.enroll": "ভর্তি হও",
  "nav.freeClasses": "ফ্রি ক্লাস",
  // Archivo, all-caps, Latin — the design keeps this label in English in both
  // locales because it reads as a typographic mark rather than as a word.
  "nav.helpline": "HELPLINE",
  "nav.menu": "মেনু",
  "nav.login": "লগ ইন",
  "nav.signOut": "লগ আউট",
  "nav.teachers": "শিক্ষক",

  "teachers.empty": "এখনো কোনো শিক্ষকের কোর্স প্রকাশিত হয়নি",
  "teachers.lead": "যাদের কাছে পড়বে — তাদের কোর্স, বিষয় আর শিক্ষার্থীর সংখ্যা এক জায়গায়।",
  "teachers.title": "আমাদের শিক্ষক",

  "role.accountant": "হিসাবরক্ষক",
  "role.admin": "অ্যাডমিন",
  "role.student": "শিক্ষার্থী",
  "role.teacher": "শিক্ষক"
} as const;

export type MessageKey = keyof typeof bn;
