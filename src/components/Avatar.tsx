// One avatar for every place a person appears: their photo when they have
// one, otherwise initials on their accent colour.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({
  name,
  accent = "#2f6f64",
  photo,
  size = "md"
}: {
  name: string;
  accent?: string;
  photo?: string;
  size?: "sm" | "md" | "lg";
}) {
  const className = `avatar avatar--${size}`;
  if (photo) {
    return <img className={`${className} avatar--photo`} src={photo} alt="" />;
  }
  return (
    <span className={className} style={{ backgroundColor: accent }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
