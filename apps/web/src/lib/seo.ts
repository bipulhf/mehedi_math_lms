import type { JSX } from "react";

import type { CourseSummary } from "@/lib/api/courses";
import { siteConfig } from "@/lib/site";

type HeadScript = JSX.IntrinsicElements["script"];

export type JsonLdScalar = boolean | null | number | string;
export type JsonLdNode = JsonLdRecord | JsonLdScalar | readonly JsonLdNode[];
export interface JsonLdRecord {
  [key: string]: JsonLdNode | undefined;
}

export interface SeoHeadInput {
  description: string;
  jsonLd?: readonly JsonLdRecord[];
  ogImageUrl?: string | null;
  ogType?: "article" | "website";
  path: string;
  title: string;
}

const MAX_DESC = 160;
const MAX_DOC_TITLE = 60;
const SITE = siteConfig.name;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function absolutePublicUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  const base = stripTrailingSlash(siteConfig.url);
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  return `${base}${path}`;
}

export function buildMetaDescription(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");

  if (normalized.length <= MAX_DESC) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_DESC - 1).trimEnd()}…`;
}

export function buildDocumentTitle(pageTitle: string): string {
  const suffix = ` | ${SITE}`;
  const maxPage = MAX_DOC_TITLE - suffix.length;
  const trimmed = pageTitle.trim();
  const page = trimmed.length > maxPage ? `${trimmed.slice(0, maxPage - 1).trimEnd()}…` : trimmed;

  return `${page}${suffix}`;
}

export function seo(input: SeoHeadInput): {
  links: Array<{ href: string; rel: "canonical" }>;
  meta: Array<
    | { charSet: "utf-8" }
    | { content: string; name: string }
    | { content: string; property: string }
    | { title: string }
  >;
  scripts?: Array<HeadScript>;
} {
  const canonical = absolutePublicUrl(input.path);
  const description = buildMetaDescription(input.description);
  const documentTitle = buildDocumentTitle(input.title);
  const ogImage =
    input.ogImageUrl !== undefined && input.ogImageUrl !== null && input.ogImageUrl.length > 0
      ? absolutePublicUrl(input.ogImageUrl)
      : absolutePublicUrl("/api/v1/og-image/default");

  const meta: Array<
    | { content: string; name: string }
    | { content: string; property: string }
    | { title: string }
  > = [
    { title: documentTitle },
    { content: description, name: "description" },
    { content: documentTitle, property: "og:title" },
    { content: description, property: "og:description" },
    { content: canonical, property: "og:url" },
    { content: input.ogType ?? "website", property: "og:type" },
    { content: ogImage, property: "og:image" },
    { content: SITE, property: "og:site_name" },
    { content: "summary_large_image", name: "twitter:card" },
    { content: documentTitle, name: "twitter:title" },
    { content: description, name: "twitter:description" },
    { content: ogImage, name: "twitter:image" }
  ];

  if (input.jsonLd === undefined || input.jsonLd.length === 0) {
    return {
      links: [{ href: canonical, rel: "canonical" }],
      meta
    };
  }

  const scripts: Array<HeadScript> = input.jsonLd.map((doc) => ({
    children: JSON.stringify(doc),
    type: "application/ld+json"
  }));

  return { links: [{ href: canonical, rel: "canonical" }], meta, scripts };
}

export function organizationJsonLd(): JsonLdRecord {
  const base = stripTrailingSlash(siteConfig.url);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    description: siteConfig.description,
    name: SITE,
    url: `${base}/`
  };
}

export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>
): JsonLdRecord {
  const base = stripTrailingSlash(siteConfig.url);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: `${base}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
      name: item.name,
      position: index + 1
    }))
  };
}

export function courseJsonLd(
  course: {
    coverImageUrl: string | null;
    description: string;
    price: string;
    slug: string;
    teachers: readonly { name: string; slug: string | null }[];
    title: string;
  },
  review: { average: number; count: number } | null
): JsonLdRecord {
  const base = stripTrailingSlash(siteConfig.url);
  const courseUrl = `${base}/courses/${course.slug}`;
  const image =
    course.coverImageUrl !== null && course.coverImageUrl.length > 0
      ? absolutePublicUrl(course.coverImageUrl)
      : `${base}/api/v1/og-image/course/${encodeURIComponent(course.slug)}`;

  const record: JsonLdRecord = {
    "@context": "https://schema.org",
    "@type": "Course",
    description: buildMetaDescription(course.description),
    image: [image],
    name: course.title,
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      price: course.price,
      priceCurrency: "BDT",
      url: courseUrl
    },
    provider: {
      "@type": "Organization",
      name: SITE,
      url: `${base}/`
    },
    url: courseUrl
  };

  if (review !== null && review.count > 0) {
    record.aggregateRating = {
      "@type": "AggregateRating",
      ratingCount: review.count,
      ratingValue: review.average
    };
  }

  if (course.teachers.length > 0) {
    record.instructor = course.teachers.map((teacher) => {
      const person: JsonLdRecord = { "@type": "Person", name: teacher.name };

      if (teacher.slug !== null && teacher.slug.length > 0) {
        person.url = `${base}/teachers/${teacher.slug}`;
      }

      return person;
    });
  }

  return record;
}

export function teacherPersonJsonLd(input: {
  bio: string | null;
  courses: readonly { slug: string; title: string }[];
  image: string | null;
  name: string;
  slug: string | null;
}): JsonLdRecord {
  const base = stripTrailingSlash(siteConfig.url);
  const url =
    input.slug !== null && input.slug.length > 0 ? `${base}/teachers/${input.slug}` : `${base}/teachers`;

  const record: JsonLdRecord = {
    "@context": "https://schema.org",
    "@type": "Person",
    affiliation: {
      "@type": "Organization",
      name: SITE,
      url: `${base}/`
    },
    jobTitle: "Teacher",
    name: input.name,
    url
  };

  if (input.image !== null && input.image.length > 0) {
    record.image = absolutePublicUrl(input.image);
  }

  if (input.bio !== null && input.bio.trim().length > 0) {
    record.description = buildMetaDescription(input.bio);
  }

  if (input.courses.length > 0) {
    record.teaches = input.courses.map((course) => ({
      "@type": "Course",
      name: course.title,
      url: `${base}/courses/${course.slug}`
    }));
  }

  return record;
}

export function itemListJsonLd(
  name: string,
  description: string,
  items: ReadonlyArray<{ name: string; path: string }>
): JsonLdRecord {
  const base = stripTrailingSlash(siteConfig.url);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    description: buildMetaDescription(description),
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: `${base}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
      name: item.name,
      position: index + 1
    })),
    name
  };
}

export function catalogItemListFromCourses(
  courses: readonly Pick<CourseSummary, "slug" | "title">[]
): JsonLdRecord {
  return itemListJsonLd(
    "Course catalog",
    "Published courses at Mehedi's Math Academy.",
    courses.map((c) => ({ name: c.title, path: `/courses/${c.slug}` }))
  );
}
