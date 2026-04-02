export default function PageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      {children}
    </section>
  );
}
