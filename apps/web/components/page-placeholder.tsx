export function PagePlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      {note ? <p className="mt-2 text-sm text-neutral-500">{note}</p> : null}
    </main>
  );
}
