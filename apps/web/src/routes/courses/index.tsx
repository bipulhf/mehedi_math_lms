import { createFileRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState, useMemo } from "react";
import { Search, BookOpen, ArrowRight } from "lucide-react";
import { CourseCard, CourseGridSkeleton } from "@/components/courses/course-card";
import { FadeIn } from "@/components/common/fade-in";
import { RouteErrorView } from "@/components/common/route-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CategoryNode } from "@/lib/api/categories";
import { listCategories } from "@/lib/api/categories";
import type { CourseSummary } from "@/lib/api/courses";
import { listCourses } from "@/lib/api/courses";
import { breadcrumbJsonLd, catalogItemListFromCourses, seo } from "@/lib/seo";
import { ssrApiGetCourses } from "@/lib/ssr-api";
import { LandingLayout } from "@/features/landing/components/landing-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/courses/")({
  head: ({ loaderData }) => {
    const courses = loaderData?.coursesForLd ?? [];

    return seo({
      description:
        "Explore every published mathematics program at Mehedi's Math Academy: pricing, teachers, and enrollment in one editorial catalog.",
      jsonLd: [
        catalogItemListFromCourses(courses),
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Courses", path: "/courses" }
        ])
      ],
      path: "/courses",
      title: "Course catalog"
    });
  },
  loader: async () => {
    const { data } = await ssrApiGetCourses({ limit: 24, page: 1, status: "PUBLISHED" });

    return { coursesForLd: data };
  },
  component: CoursesCatalogPage,
  errorComponent: RouteErrorView
});

function flattenCategories(categories: readonly CategoryNode[]): readonly CategoryNode[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

function CoursesCatalogPage(): JSX.Element {
  const [categories, setCategories] = useState<readonly CategoryNode[]>([]);
  const [courses, setCourses] = useState<readonly CourseSummary[]>([]);
  const [categoryId, setCategoryId] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const categoryData = await listCategories();
      setCategories(categoryData);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      try {
        const response = await listCourses({
          categoryId: categoryId === "all" ? undefined : categoryId,
          limit: 24,
          page: 1,
          search: search || undefined
        });
        setCourses(response.data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [categoryId, search]);

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);

  return (
    <LandingLayout showGrid={false}>
      <div className="bg-surface min-h-screen">
        {/* Search and Filters Bar */}
        <section className="sticky top-20 z-40 bg-surface/80 backdrop-blur-2xl border-b border-outline-variant/10 shadow-sm">
          <div className="max-w-7xl mx-auto px-8 py-4 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="relative w-full md:max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-outline group-focus-within:text-secondary transition-colors" />
              <Input
                placeholder="Search the archive..."
                className="pl-11 h-12 rounded-2xl bg-surface-container-low border-outline-variant/20 focus:ring-2 focus:ring-secondary/20 transition-all font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex-1 md:w-56 font-bold text-xs uppercase tracking-widest">
                <Select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="rounded-2xl border-outline-variant/20 h-12"
                >
                  <option value="all">All Specializations</option>
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex-1 md:w-48 font-bold text-xs uppercase tracking-widest">
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="rounded-2xl border-outline-variant/20 h-12"
                >
                  <option value="newest">Newest Releases</option>
                  <option value="popular">Most Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Content Area */}
        <main className="max-w-7xl mx-auto px-8 py-20 pb-40">
          {isLoading ? (
            <CourseGridSkeleton />
          ) : courses.length === 0 ? (
            <FadeIn>
              <div className="text-center py-40 bg-surface-container-lowest rounded-4xl border border-dashed border-outline-variant/20 flex flex-col items-center gap-6">
                <div className="size-20 rounded-full bg-surface-container-high flex items-center justify-center text-outline">
                  <BookOpen className="size-8 opacity-20" />
                </div>
                <div>
                  <h3 className="text-2xl font-headline font-black text-on-surface">
                    No manuscripts found
                  </h3>
                  <p className="text-on-surface-variant mt-2 max-w-xs mx-auto text-sm italic">
                    The intelligence archive currently contains no records matching your active
                    parameters.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setCategoryId("all");
                  }}
                  className="rounded-xl border-outline-variant/20 text-xs font-black uppercase tracking-widest"
                >
                  Clear Filters
                </Button>
              </div>
            </FadeIn>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}

          {/* Pagination or Load More could go here if implemented in API */}
        </main>

        {/* CTA Footer Section */}
        <section className="max-w-7xl mx-auto px-8 pb-32">
          <div className="p-12 lg:p-20 bg-linear-to-br from-secondary to-on-primary-container rounded-5xl relative overflow-hidden text-center lg:text-left flex flex-col lg:flex-row items-center justify-between gap-12 group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-700"></div>
            <div className="relative z-10 max-w-2xl space-y-6">
              <h2 className="text-4xl lg:text-5xl font-headline font-black text-white tracking-tighter">
                Can't find the curriculum <br />
                you're searching for?
              </h2>
              <p className="text-white/80 text-lg font-medium italic">
                Join our academic advisory board to request specialized course content or explore
                custom institutional solutions.
              </p>
            </div>
            <div className="relative z-10 shrink-0">
              <Button className="h-16 px-10 rounded-2xl bg-white text-secondary font-headline font-black text-lg shadow-2xl hover:scale-[1.05] transition-transform flex items-center gap-3">
                Get in Touch
                <ArrowRight className="size-5" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}
