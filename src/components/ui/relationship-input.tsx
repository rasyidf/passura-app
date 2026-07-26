import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface RelationshipOption {
  /** The stored value (usually an ID) */
  value: string;
  /** Primary label shown in the trigger and list */
  label: string;
  /** Optional secondary text shown below the label in the list */
  description?: string;
}

export interface RelationshipInputProps {
  options: RelationshipOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

/**
 * A Payload CMS-style relationship selector.
 * Opens a searchable popover — like a combobox — so users can quickly find
 * related records without scrolling through a long <select>.
 * When a value is selected and clearable=true, the chevron is replaced by
 * an inline × button inside the trigger.
 */
export function RelationshipInput({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  emptyMessage = "Tidak ditemukan.",
  disabled = false,
  clearable = true,
  className,
}: RelationshipInputProps) {
  const [open, setOpen] = React.useState(false);

  const selected = options.find((o) => o.value === value);

  // Deduplicate by value (ID) in case the data source has duplicates
  const uniqueOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return options.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }, [options]);

  const showClear = clearable && !!value && !disabled;

  return (
    <div className={cn("flex items-center", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "h-9 w-full justify-between px-3 font-normal",
                !selected && "text-muted-foreground"
              )}
            />
          }
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          {showClear ? (
            <span
              role="button"
              aria-label="Hapus pilihan"
              tabIndex={0}
              className="ml-2 size-4 shrink-0 rounded-sm opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          )}
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {uniqueOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.description ?? ""} ${option.value}`}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="truncate text-sm font-medium">
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="truncate text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Multi-value Relationship Input ──────────────────────────────────────────

export interface MultiRelationshipInputProps {
  options: RelationshipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Multi-select variant of RelationshipInput.
 * Shows selected items as dismissible badges above an "add" combobox.
 */
export function MultiRelationshipInput({
  options,
  value,
  onChange,
  placeholder = "Tambah...",
  searchPlaceholder = "Cari...",
  emptyMessage = "Tidak ditemukan.",
  disabled = false,
  className,
}: MultiRelationshipInputProps) {
  const [open, setOpen] = React.useState(false);

  const uniqueOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return options.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }, [options]);

  const selectedOptions = uniqueOptions.filter((o) => value.includes(o.value));
  const unselectedOptions = uniqueOptions.filter((o) => !value.includes(o.value));

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected tags */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((opt) => (
            <Badge
              key={opt.value}
              variant="secondary"
              className="gap-1 pr-1 h-6 text-xs font-normal"
            >
              <span className="truncate max-w-[140px]">{opt.label}</span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Hapus ${opt.label}`}
                  className="ml-0.5 rounded-full opacity-60 hover:opacity-100 focus:outline-none"
                  onClick={() => remove(opt.value)}
                >
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Add popover */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-9 w-full justify-between px-3 font-normal text-muted-foreground"
              />
            }
          >
            <span className="truncate">{placeholder}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder={searchPlaceholder} />
              <CommandList>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {uniqueOptions.map((option) => {
                    const isSelected = value.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        value={`${option.label} ${option.description ?? ""} ${option.value}`}
                        onSelect={() => {
                          toggle(option.value);
                          // keep popover open so user can pick multiple
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="flex flex-col min-w-0">
                          <span className="truncate text-sm font-medium">
                            {option.label}
                          </span>
                          {option.description && (
                            <span className="truncate text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          )}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
