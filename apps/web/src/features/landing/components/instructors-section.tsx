export function InstructorsSection() {
  return (
    <section className="py-32 px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-20 space-y-6">
        <p className="text-xs font-bold tracking-[0.3em] text-secondary uppercase">
          Learn from the Best
        </p>
        <h2 className="text-5xl font-headline font-extrabold tracking-tight">
          World-Class Educators
        </h2>
        <p className="text-on-surface-variant font-light">
          We only partner with educators who are masters of their craft, ensuring you learn not just
          the &quot;what&quot; but the &quot;why&quot;.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Instructor 1 */}
        <div className="text-center group">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-primary/10 rounded-full flex scale-0 group-hover:scale-100 transition-transform duration-500"></div>
            <img
              alt="Professional portrait of Dr. Ryan Carter"
              className="w-32 h-32 rounded-full object-cover mx-auto relative z-10 border-4 border-white shadow-xl"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyzKppcbhs62oInA2xH9I9iJ-OezjeIIvbFKyuJsatSO3Ex2CbALsHA6nV9xo521e20pwZJdL5R7j1qTHRmkvEEUZV5T_2IlAhMTVNUtILnmmaH00sfqEKiA2zLhu6xIDg83A7oJ5_Y-clB8mHdVxM9XwF0JNDgTsCbPfTyMFNLL_hu-x_w5hRece4tMN_mXCyvBq2XkpBnEWoPv_4JDlYRhSAY_1rqkHckU6NBit04iR7nS8WNayptXUcpvDcdtUcp5WE363dBaw"
            />
          </div>
          <h4 className="text-lg font-headline font-bold">Dr. Ryan Carter</h4>
          <p className="text-xs text-outline uppercase tracking-wider mb-2">Theoretical Physics</p>
          <p className="text-xs font-bold text-secondary">12,400 Students</p>
        </div>
        {/* Instructor 2 */}
        <div className="text-center group">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-primary/10 rounded-full flex scale-0 group-hover:scale-100 transition-transform duration-500"></div>
            <img
              alt="Professional portrait of Prof. Lina Wang"
              className="w-32 h-32 rounded-full object-cover mx-auto relative z-10 border-4 border-white shadow-xl"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4Vi2iG19iqa5At-iw2AHjsBvEwj_ilPiQlxFnj_D2j_vmbV_oB6f8UzS5eK1pfjbhRMbqIyEugzdVaESQ_vBFidFD_nAKCnYng9DmEOMRGMnXE8ePe485qG0nTNGIXaM_yUcV6Y9dCRzyP2fzDhcBjYdkxJQH6TLTFPSSKcTb7-wW_FrBV45D3gb1dNENuUVnTvFl6X0JquRuqKl36KnEL_NkOFK66RJGWybTbZsqMi8KP8Zyrtv0lKSFVPBXJtnRwrsS5KgwjDw"
            />
          </div>
          <h4 className="text-lg font-headline font-bold">Prof. Lina Wang</h4>
          <p className="text-xs text-outline uppercase tracking-wider mb-2">Systems Architecture</p>
          <p className="text-xs font-bold text-secondary">8,900 Students</p>
        </div>
        {/* Instructor 3 */}
        <div className="text-center group">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-primary/10 rounded-full flex scale-0 group-hover:scale-100 transition-transform duration-500"></div>
            <img
              alt="Portrait of a young professional academic man"
              className="w-32 h-32 rounded-full object-cover mx-auto relative z-10 border-4 border-white shadow-xl"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNIakmORsy3LbuCtYHDO_uf7qHcpHdD-FQDTw7PIgYO_YPZO4gHKJFNj3bGahAyE69FL3gQ1ZJ7128-bP0NX7u1v6sjetzHTN6IehTJdgw2O2hIRq2tkHLS3zuZ4OLsNYx3txt6x7tP0jXU9htniZ4ehilo66F_EgSfKNUcX9J4bFbdqr6EGJTTU7i1fodLE5cj42M0ZTguW3YCHRVaMdDFpybJLPzwImOO7sJXdCF08R6Nfg15Ad_oeINCsdvyKw2lx7n3Em28KI"
            />
          </div>
          <h4 className="text-lg font-headline font-bold">Marcus Thorne</h4>
          <p className="text-xs text-outline uppercase tracking-wider mb-2">Digital Humanities</p>
          <p className="text-xs font-bold text-secondary">15,200 Students</p>
        </div>
        {/* Instructor 4 */}
        <div className="text-center group">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-primary/10 rounded-full flex scale-0 group-hover:scale-100 transition-transform duration-500"></div>
            <img
              alt="Portrait of a sophisticated female professor"
              className="w-32 h-32 rounded-full object-cover mx-auto relative z-10 border-4 border-white shadow-xl"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7s3uhL5mQI1U-slP8Vmumz5MOwejTeJQfbSLb3lT8cw9HWPkZqeRy29sHr93lpO10stHJBZ9PCAeZQN5_vlCxwD_keMtrtBGNqXVExjuCrMA-87jg6pdyxs4jeFM6yu7KwqrkNhFB8WI0bRHrq-qwfalpNUJUPvqW_0T-SV0FXWFSxarB9-Uq_7mh062CtmUv7-do8WASqny0cNOUiFwMXaUZVERErzjstmw0yGWZuMMIUWD6F0NUEWf5XGQHUGNZHSgC7kuOlC4"
            />
          </div>
          <h4 className="text-lg font-headline font-bold">Dr. Elena Rossetti</h4>
          <p className="text-xs text-outline uppercase tracking-wider mb-2">Molecular Biology</p>
          <p className="text-xs font-bold text-secondary">6,700 Students</p>
        </div>
      </div>
    </section>
  );
}
