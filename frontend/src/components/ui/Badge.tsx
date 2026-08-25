import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      neutral: 'bg-secondary text-muted-foreground',
      ok: 'bg-accent/15 text-accent',
      warning: 'bg-warning/15 text-warning',
      danger: 'bg-destructive/15 text-destructive',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
