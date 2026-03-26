import { ArrowLeft, ArrowRight, Star } from "lucide-react";

export function CoursesSection() {
  return (
    <section className="bg-surface-container-low py-32 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-20 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="h-px w-12 bg-primary"></span>
              <span className="text-xs font-bold tracking-widest text-outline uppercase">
                Showcasing 1,240 courses
              </span>
            </div>
            <h2 className="text-5xl font-headline font-extrabold tracking-tight">Elite Coursework</h2>
          </div>
          <div className="flex gap-2">
            <button className="p-4 rounded-full border border-outline-variant/20 hover:bg-white transition-all">
              <ArrowLeft className="size-6 text-on-surface" />
            </button>
            <button className="p-4 rounded-full border border-outline-variant/20 hover:bg-white transition-all">
              <ArrowRight className="size-6 text-on-surface" />
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Course 1 */}
          <div className="bg-surface-container-lowest rounded-4xl overflow-hidden group border border-outline-variant/5 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
            <div className="h-64 overflow-hidden relative">
              <img
                alt="Abstract glowing mathematical visualization"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuxi8QVUnzv_vPAJ1-7E8lR8_ZUR8oe2I65Ukig7XUBlYWMBvMa_l0ftn_1favNAMHExAghBx_EELUDJyEqfBDmtOBROmq59GUJOzLvaCKpJHPQtfjxKW4c-4INICYWE1_sgvSYGkhIhYOmtCnu-Z0Or76OBvhGOBEthJJlL0ubs2OFNifER8kv3U4ZhKh_6ENA5G3hh2pYSWrSJf9PRJk4nWgdmG_JrOQWyODzZb2gIpZEUizilVMmaKGC4hmhd_i_xC3luxeswk"
              />
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-primary uppercase">
                  HSC Science
                </span>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-headline font-bold leading-tight group-hover:text-secondary transition-colors">
                  Advanced Physics: Quantum Foundations
                </h3>
                <p className="text-lg font-bold font-headline">৳4,500</p>
              </div>
              <div className="flex items-center gap-4 py-4 border-y border-outline-variant/10">
                <img
                  alt="Portrait of professional male physics professor"
                  className="w-10 h-10 rounded-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1XCPr-wCxJWuw1NDixpdGQFSjD7P557MhFT4Vt5rc9iWzxWQjQTHQ_rvB_fBCUhRNk4Z4padVzXJsGWkN9g9XsoOXaR_BoOLIk78dS5wRm3p85YoFrnsZVkFJeUN--nugeobzTIfPi2ri4tUR5Mj2TxeYgH74rNmSA2StSWonwvjl3Uhl6JDOW2GJ8uktjoevlRT101V5p1Z8_bWkFedKFhjeKcNMqjWykHZ3mBF5XRd6OTZ1LjCFzDPfI0WFmr8cIUPdXaNAQBw"
                />
                <div>
                  <p className="text-sm font-semibold">Dr. Ryan Carter</p>
                  <p className="text-[10px] text-outline uppercase font-medium">Cambridge PhD</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-secondary">
                  <Star className="size-4 fill-secondary" />
                  <span className="text-xs font-bold">4.9</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-outline uppercase">
                <span>32 Lectures</span>
                <span>14.5 Hours</span>
              </div>
            </div>
          </div>
          {/* Course 2 */}
          <div className="bg-surface-container-lowest rounded-4xl overflow-hidden group border border-outline-variant/5 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
            <div className="h-64 overflow-hidden relative">
              <img
                alt="Clean desk workspace with high-end laptop showing coding interface"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxwUJ53lsOP-TYUdXsxZDR7bpE7ajC4zbM4bSeGfhlOHU_PCjdFE021UpM-1P4WUt5EqQ8f-CA8Ns8EYMu-W34Y2gMffJW7Yf74hyLxLij5CpgSvZ2kdvnAq2e_TXGBNLJDvtMz7KfEkpbU_oM3rtulxgIZcpuzkZV1QhwudLW0kX3dGuOcN8qQOf_6uEztyB1Oub33_IpLeL4D3ivqv9SpGgPkWtCZ-CFilFXJWGEz77BwRt8i_TxAwbE0WlsQm13tWMhMHFh2kM"
              />
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-primary uppercase">
                  Professional
                </span>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-headline font-bold leading-tight group-hover:text-secondary transition-colors">
                  Full-Stack Architecture &amp; Design
                </h3>
                <p className="text-lg font-bold font-headline">৳6,200</p>
              </div>
              <div className="flex items-center gap-4 py-4 border-y border-outline-variant/10">
                <img
                  alt="Close up portrait of a professional female software engineer"
                  className="w-10 h-10 rounded-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtD8A2WyW9oualtWZwWHESdssHP60IFUqFjAAx9jvLaoyP52AquLtaNoM23r9XG_LX8c9L3ZmYskZYpFrpXm2128-bZjMeJsypXsxmB9OVTuLYEnwLoK0YF_3an_QJ5Wtbo823sWgTDDUbRNoz0xeZYNfF1KnvLBD1F3M9vPzmrVhQh2Wj0GqzYhqDPWT9O1CNolSwjiRGLQml6K1Sk_Pw2STGeIVKlu-Xg5CNU-qwJULgciN_Sy7veK8PtmfqPN2cxBfC-ZRtWxM"
                />
                <div>
                  <p className="text-sm font-semibold">Prof. Lina Wang</p>
                  <p className="text-[10px] text-outline uppercase font-medium">
                    Sr. Engineer @ Tech
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-secondary">
                  <Star className="size-4 fill-secondary" />
                  <span className="text-xs font-bold">5.0</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-outline uppercase">
                <span>58 Lectures</span>
                <span>24 Hours</span>
              </div>
            </div>
          </div>
          {/* Course 3 */}
          <div className="bg-surface-container-lowest rounded-4xl overflow-hidden group border border-outline-variant/5 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
            <div className="h-64 overflow-hidden relative">
              <img
                alt="A focused close up of an open journal"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_BZwPYmmwLgXBHKZOvtBprZSGAaRyBCW1Uy9aDuFVit8RNr2Djrdnw7eXdb5KoeeRyHVW68vdkfTpNzmSJmfOUIbZF3kcqjUJLfdOPt2FrxhUJLvQKMOTGGa-bQ73r5CaXZOrUYe2K4-2mj-LNvDHRyUI_YhQ4ERrWu3c4h-vvdv6ywsoQH_DNff_VulXggbm1Ua0aorrDyZvQaSKQnf-6BphQG3UJcfTkQHdKyjkJ8UgkeMll3cu_y3f43aYAW1YR7km0VQlEkc"
              />
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-primary uppercase">
                  SSC Prep
                </span>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-headline font-bold leading-tight group-hover:text-secondary transition-colors">
                  Creative Writing &amp; Literary Analysis
                </h3>
                <p className="text-lg font-bold font-headline">৳3,800</p>
              </div>
              <div className="flex items-center gap-4 py-4 border-y border-outline-variant/10">
                <img
                  alt="Portrait of an approachable academic man with glasses"
                  className="w-10 h-10 rounded-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6gJK8tIu6-LPfsFc7YDEgZ5HlKI70MeB1lB_4YyjjQ3qiiMPhHHhxZwyZf9YLiyJiKoyvZvfCa0H7N4JzhwBrkYIzqf-7vNRictonO0fxkr4vp9UbdFtjezCC8xHI7A_5LckwZYC6DrZq2dARMNNLqBIqtSNgvUwwZb8_6fwt5cR2WDOGeMJr0gihGleEUisA4lgBP53luMvQuptd_DL5TB5gosuEQZ3OglfFcwzLHoHjWPFzeFCrtRQIT2wbmMiasArtZIpikb4"
                />
                <div>
                  <p className="text-sm font-semibold">Dr. James Miller</p>
                  <p className="text-[10px] text-outline uppercase font-medium">Bestselling Author</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-secondary">
                  <Star className="size-4 fill-secondary" />
                  <span className="text-xs font-bold">4.8</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-outline uppercase">
                <span>20 Lectures</span>
                <span>12 Hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
