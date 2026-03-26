import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="max-w-7xl mx-auto px-8 mb-32">
      <div className="bg-linear-to-br from-primary to-on-primary-container rounded-[3rem] p-20 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="relative z-10 space-y-8">
          <h2 className="text-5xl font-headline font-extrabold max-w-2xl mx-auto leading-tight">
            Begin Your Journey Toward Academic Mastery
          </h2>
          <p className="text-on-primary-container font-light max-w-xl mx-auto opacity-90">
            Join 15,000+ high-performers today and gain access to our curated catalog of expert-led
            courses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button className="bg-white text-primary px-10 py-6 text-base rounded-xl font-headline font-extrabold hover:bg-surface transition-all">
              Enroll Now
            </Button>
            <Button
              variant="outline"
              className="bg-transparent border-white/30 text-white hover:text-white px-10 py-6 text-base rounded-xl font-headline font-semibold hover:bg-white/10 transition-all"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
