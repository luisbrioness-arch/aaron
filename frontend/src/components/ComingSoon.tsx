export function ComingSoon({
  title,
  description,
  task,
}: {
  title: string;
  description: string;
  task: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <span className="mt-4 rounded-full bg-secondary px-3 py-1 font-mono text-xs text-muted-foreground">
        {task} — ver NEXT_STEPS.md
      </span>
    </div>
  );
}
