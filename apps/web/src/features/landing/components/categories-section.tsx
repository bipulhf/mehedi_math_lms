import { Link } from "@tanstack/react-router";
import { FlaskConical, Calculator, Terminal, Globe } from "lucide-react";

export function CategoriesSection() {
  return (
    <section className="py-32 px-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-16">
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-[0.2em] text-secondary uppercase">
            Foundations &amp; Beyond
          </p>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight">Curated Categories</h2>
        </div>
        <Link
          to="/categories"
          className="text-sm font-headline font-bold border-b-2 border-primary pb-1 hover:text-secondary hover:border-secondary transition-all"
        >
          View Full Catalog
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Category 1 */}
        <div className="group bg-surface hover:bg-surface-container-lowest p-10 rounded-3xl border border-outline-variant/10 transition-all duration-300">
          <FlaskConical className="size-10 mb-8 text-primary group-hover:scale-110 transition-transform block" />
          <h4 className="text-lg font-headline font-bold mb-2">SSC Science</h4>
          <p className="text-xs text-on-surface-variant font-light">
            Physics, Chemistry &amp; Higher Math foundations.
          </p>
        </div>
        {/* Category 2 */}
        <div className="group bg-surface hover:bg-surface-container-lowest p-10 rounded-3xl border border-outline-variant/10 transition-all duration-300">
          <Calculator className="size-10 mb-8 text-primary group-hover:scale-110 transition-transform block" />
          <h4 className="text-lg font-headline font-bold mb-2">HSC Maths</h4>
          <p className="text-xs text-on-surface-variant font-light">
            Advanced Calculus and Statistical Analysis.
          </p>
        </div>
        {/* Category 3 */}
        <div className="group bg-surface hover:bg-surface-container-lowest p-10 rounded-3xl border border-outline-variant/10 transition-all duration-300">
          <Terminal className="size-10 mb-8 text-primary group-hover:scale-110 transition-transform block" />
          <h4 className="text-lg font-headline font-bold mb-2">Programming</h4>
          <p className="text-xs text-on-surface-variant font-light">
            Full-stack engineering and Algorithm design.
          </p>
        </div>
        {/* Category 4 */}
        <div className="group bg-surface hover:bg-surface-container-lowest p-10 rounded-3xl border border-outline-variant/10 transition-all duration-300">
          <Globe className="size-10 mb-8 text-primary group-hover:scale-110 transition-transform block" />
          <h4 className="text-lg font-headline font-bold mb-2">IELTS/SAT</h4>
          <p className="text-xs text-on-surface-variant font-light">
            Comprehensive global standard exam prep.
          </p>
        </div>
      </div>
    </section>
  );
}
