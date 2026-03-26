export function StatsSection() {
  return (
    <section className="bg-surface-container-low py-20 px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
        <div className="flex gap-16">
          <div className="space-y-1">
            <p className="text-4xl font-headline font-extrabold text-primary">15k+</p>
            <p className="text-xs font-bold tracking-widest text-outline uppercase">
              Active Learners
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-headline font-extrabold text-primary">1.2k</p>
            <p className="text-xs font-bold tracking-widest text-outline uppercase">
              Expert Ateliers
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-headline font-extrabold text-primary">4.9/5</p>
            <p className="text-xs font-bold tracking-widest text-outline uppercase">Avg. Rating</p>
          </div>
        </div>
        <div className="max-w-md">
          <h3 className="text-xl font-headline font-bold mb-3">The Premium Learning Experience</h3>
          <p className="text-sm text-on-surface-variant font-light leading-relaxed">
            We don't just host videos. We curate environments where academic rigor meets modern
            intuition. Every course is audited for clarity, depth, and performance impact.
          </p>
        </div>
      </div>
    </section>
  );
}
