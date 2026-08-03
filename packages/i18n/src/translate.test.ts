import { describe, expect, test } from "bun:test";

import { isLocale, locales } from "./locales";
import { bn } from "./messages/bn";
import { en } from "./messages/en";
import { createTranslator, dictionaries, translate } from "./translate";

describe("the catalogue", () => {
  test("English covers every Bangla key and adds none of its own", () => {
    // `en` is typed as a complete record, so a missing key is already a
    // compile error. This catches the other direction — a stray key that no
    // longer exists in the source catalogue.
    expect(Object.keys(en).sort()).toEqual(Object.keys(bn).sort());
  });

  test("no message is left empty", () => {
    for (const locale of locales) {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(value.length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("translate", () => {
  test("returns the message for the locale", () => {
    expect(translate("bn", "nav.courses")).toBe("কোর্স");
    expect(translate("en", "nav.courses")).toBe("Courses");
  });

  test("the helpline label stays Latin in both locales", () => {
    // Deliberate: it reads as a typographic mark, not as a word.
    expect(translate("bn", "nav.helpline")).toBe("HELPLINE");
    expect(translate("en", "nav.helpline")).toBe("HELPLINE");
  });
});

describe("interpolation", () => {
  test("fills every placeholder", () => {
    expect(translate("bn", "courses.resultCount", { shown: "৬", total: "১৮৪" })).toBe(
      "৬টি কোর্স দেখানো হচ্ছে · মোট ১৮৪টি"
    );
    expect(translate("en", "courses.resultCount", { shown: 6, total: 184 })).toBe(
      "Showing 6 of 184 courses"
    );
  });

  test("an unfilled placeholder stays visible rather than collapsing", () => {
    // A count that never arrived is a bug worth seeing on the page.
    expect(translate("en", "courses.resultCount", { shown: 6 })).toBe(
      "Showing 6 of {total} courses"
    );
  });

  test("a message with no placeholders is untouched by params", () => {
    expect(translate("en", "action.save", { unused: 1 })).toBe("Save");
  });
});

describe("createTranslator", () => {
  test("binds the locale once", () => {
    const t = createTranslator("bn");

    expect(t("action.enroll")).toBe("ভর্তি হও");
  });
});

describe("isLocale", () => {
  test("guards anything read back off a cookie or a query string", () => {
    expect(isLocale("bn")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(2)).toBe(false);
  });
});
