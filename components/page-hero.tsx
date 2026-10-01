/** Shorter red hero band for inner pages. */
export function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="hero-red-short relative overflow-hidden pt-28 pb-28 md:pt-36 md:pb-32">
      <div className="mx-auto max-w-6xl px-4 text-center text-white md:px-8">
        <p className="eyebrow text-white/80">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1>
        {children && <div className="mx-auto mt-4 max-w-xl text-base text-white/90 md:text-lg">{children}</div>}
      </div>
    </section>
  );
}
