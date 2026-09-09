import { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface LiveClockProps {
  variant?: 'sidebar' | 'compact' | 'header' | 'topbar';
  className?: string;
}

export function LiveClock({ variant = 'sidebar', className = '' }: LiveClockProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = now.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dayName = now.toLocaleDateString('es-CL', { weekday: 'long' });
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  const dateString = now.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const shortDate = now.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  });

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-xl bg-secondary/70 px-2.5 py-1 text-xs font-mono font-semibold text-foreground border border-border/70 shadow-2xs ${className}`}
        title={`${capitalizedDay}, ${dateString}`}
      >
        <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <Clock className="size-3 text-emerald-600 dark:text-emerald-400" />
        <span>{timeString}</span>
      </div>
    );
  }

  if (variant === 'topbar') {
    return (
      <div
        className={`inline-flex items-center gap-2 sm:gap-2.5 rounded-full border border-border/80 bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs backdrop-blur-xs ${className}`}
        title={`Sistema sincronizado: ${capitalizedDay}, ${dateString}`}
      >
        <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="capitalize">{capitalizedDay}</span>, <span>{dateString}</span>
        </div>
        <span className="hidden sm:inline-block text-border">•</span>
        <div className="flex items-center gap-1.5 font-mono font-semibold">
          <Clock className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{timeString}</span>
          <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="En línea" />
        </div>
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div
        className={`inline-flex items-center gap-3 rounded-xl border border-border/80 bg-card px-3 py-1.5 shadow-2xs ${className}`}
      >
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Calendar className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="capitalize">{capitalizedDay}</span>, <span>{shortDate}</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
          <Clock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{timeString}</span>
          <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
        </div>
      </div>
    );
  }

  // Variant 'sidebar' por defecto
  return (
    <div className={`rounded-2xl border border-border/80 bg-secondary/30 p-3 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
        <div className="flex items-center gap-1.5 min-w-0 pr-1 truncate">
          <Calendar className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">{capitalizedDay}, {dateString}</span>
        </div>
        <span
          className="flex size-2 shrink-0 rounded-full bg-emerald-500 animate-pulse"
          title="Sistema en línea"
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <div className="font-mono text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <Clock className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{timeString}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded-md">
          Chile
        </span>
      </div>
    </div>
  );
}
