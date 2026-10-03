export function PagePlaceholder({ title }: { title: string }) {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>{title}</h1>
    </main>
  );
}
