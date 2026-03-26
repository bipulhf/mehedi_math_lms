import { Search, Award } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeroSection() {
  return (
    <section className="relative px-8 pt-20 pb-32 max-w-7xl mx-auto overflow-hidden">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-10 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-bold tracking-[0.1em] text-secondary uppercase">
            <span className="w-1 h-1 bg-secondary rounded-full"></span>
            The New Standard of Learning
          </div>
          <h1 className="text-7xl font-extrabold font-headline leading-[1.05] tracking-tight text-on-background">
            Elevating Your <br />
            <span className="text-on-primary-container italic font-light">Academic Potential</span>
          </h1>
          <p className="text-lg text-on-surface-variant leading-relaxed max-w-lg font-light">
            Experience a curated academic atelier designed for high-performance students. From SSC
            foundations to professional mastery, we treat education as a craft.
          </p>
          <div className="flex justify-between items-center w-full bg-surface-container-lowest border border-outline-variant/20 p-1.5 rounded-xl shadow-sm">
            <div className="flex items-center flex-1">
              <Search className="ml-4 text-outline size-5 shrink-0" />
              <Input
                className="bg-transparent border-none focus-visible:ring-0 shadow-none text-sm flex-1 py-3 px-3"
                placeholder="What would you like to learn today?"
                type="text"
              />
            </div>
            <Button className="bg-primary text-white px-8 h-full py-3 rounded-lg font-headline font-semibold text-sm hover:bg-on-surface transition-all shrink-0">
              Explore
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>
          <div className="bg-surface-container-low rounded-[2rem] p-4 aspect-square overflow-hidden rotate-2 shadow-2xl shadow-primary/5">
            <img
              alt="Minimalist modern library focused academic environment"
              className="w-full h-full object-cover rounded-[1.5rem] grayscale-[30%] hover:grayscale-0 transition-all duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCBVM4ASBWMj4U5LbTxJZKBq2aHjKT2iW8f2Oo7eGXhsJqyUc9m8Wn2d7iHsYrQNU7q06wbg74jyS-pPiknWzBguaRPD0rzeGBf8PU6jpyjOdUy7R9O0L9AckRIhesoz6LRgRMW1rrMSj-kkrFqGlloWNVLORUtvQurV2hSu6qNAsKtICRwZhKjeeCXKLZm58Rqfb1aDZgQ5XeAnttI7U4FCYdG0PaKdfE3Ee28H_exuvR7IcJL2zO7gilwi7DACLuk3a5OR1DYGY0"
            />
          </div>
          <div className="absolute bottom-12 -left-12 bg-surface-container-lowest p-6 rounded-2xl shadow-xl border border-outline-variant/10 max-w-[240px]">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary to-on-primary-container flex items-center justify-center text-white">
                <Award className="size-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-outline tracking-wider uppercase">
                  Curated Quality
                </p>
                <p className="text-sm font-headline font-bold">98% Success Rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
