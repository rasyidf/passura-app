import { cn } from "@/lib/utils";

/**
 * Formats a number as IDR currency.
 * - >= 1 billion  → "Rp 1,2M"
 * - >= 1 million  → "Rp 5jt"
 * - otherwise     → full "Rp 500.000"
 */
export function formatIDR(value: number): string {
  if (value >= 1_000_000_000)
    return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000)
    return `Rp ${(value / 1_000_000).toFixed(0)}jt`;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Full IDR format — always shows the unabbreviated number.
 * Use inside table cells where precision matters.
 */
export function formatIDRFull(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

interface MoneyCellProps {
  /** Numeric value in IDR (rupiah). Nullish values render as "—". */
  value: number | null | undefined;
  /**
   * - "full"  — always unabbreviated, e.g. "Rp 10.000.000" (default for tables)
   * - "short" — abbreviated, e.g. "Rp 10jt"
   */
  format?: "full" | "short";
  /** Extra class names applied to the wrapper span. */
  className?: string;
  /**
   * When true and value <= 0 the amount is rendered in green.
   * When true and value > 0  the amount is rendered in primary (blue/brand).
   * Useful for "remaining balance" cells.
   */
  highlightBalance?: boolean;
}

/**
 * Standardised money cell for use inside TanStack Table `cell` renderers.
 *
 * @example
 * ```tsx
 * {
 *   accessorKey: "calculatedValue",
 *   header: "Nilai",
 *   cell: ({ row }) => <MoneyCell value={row.original.calculatedValue} />,
 * }
 * ```
 */
export function MoneyCell({
  value,
  format = "full",
  className,
  highlightBalance = false,
}: MoneyCellProps) {
  if (value == null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>—</span>;
  }

  const text = format === "short" ? formatIDR(value) : formatIDRFull(value);

  const colorClass = highlightBalance
    ? value <= 0
      ? "text-green-600"
      : "text-primary"
    : undefined;

  return (
    <span
      className={cn(
        "font-mono text-sm tabular-nums",
        colorClass,
        className
      )}
    >
      {text}
    </span>
  );
}
