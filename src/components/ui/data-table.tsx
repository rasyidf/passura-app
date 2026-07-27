"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { Button } from "./button";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { DateRangePicker, type DateRangeValue } from "./date-range-picker";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Check, ChevronDown } from "lucide-react";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    X,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { Spinner } from "./spinner";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty";
import { Skeleton } from "./skeleton";
import {
    ColumnDef,
    ColumnFiltersState,
    FilterFn,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    PaginationState,
} from "@tanstack/react-table";

/** The value stored for a daterange filter column. */
// Re-exported from date-range-picker for consumers that import from data-table
export type { DateRangeValue } from "./date-range-picker";

/**
 * TanStack Table filterFn that compares a cell's "yyyy-MM-dd" string value
 * against a { from, to } range. Empty bounds are treated as open-ended.
 */
const dateRangeFilterFn: FilterFn<any> = (row, columnId, filterValue: DateRangeValue) => {
    const cell = row.getValue<string>(columnId);
    if (!cell) return false;
    const date = cell.slice(0, 10); // normalise to "yyyy-MM-dd"
    if (filterValue.from && date < filterValue.from) return false;
    if (filterValue.to && date > filterValue.to) return false;
    return true;
};
dateRangeFilterFn.autoRemove = (val: DateRangeValue | undefined) =>
    !val || (!val.from && !val.to);

/**
 * TanStack Table filterFn for multiselect — passes if the cell value is in
 * the selected set. Empty array = no filter.
 */
const multiSelectFilterFn: FilterFn<any> = (row, columnId, filterValue: string[]) => {
    if (!filterValue || filterValue.length === 0) return true;
    const cell = row.getValue<string>(columnId);
    return filterValue.includes(cell);
};
multiSelectFilterFn.autoRemove = (val: string[] | undefined) => !val || val.length === 0;

/**
 * Filter configuration for DataTable columns
 */
export interface DataTableFilterOption {
    id: string; // column accessorKey
    label: string; // UI label
    type: "select" | "segmented" | "text" | "daterange" | "multiselect";
    options?: { value: string; label: string }[]; // for select/segmented/multiselect
    placeholder?: string;
}

/**
 * Core DataTable props for client-side operations
 */
export interface DataTableProps<T> {
    // Required
    columns: ColumnDef<T, any>[];
    data: T[];

    // Styling
    className?: string;

    // Pagination
    initialPageSize?: number;
    pageSizeOptions?: number[];

    // Filtering
    searchableColumnIds?: string[]; // columns eligible for global search
    searchPlaceholder?: string;
    filters?: DataTableFilterOption[]; // additional column filters

    // State
    loading?: boolean;
    error?: string | null;

    // Actions
    onEdit?: (row: T) => void;
    onDelete?: (row: T) => void;
    onRowClick?: (row: T) => void;

    // Selection
    enableSelection?: boolean;
    onRowSelectionChange?: (selection: Record<string, boolean>) => void;

    // Column visibility
    onColumnVisibilityChange?: (visibility: VisibilityState) => void;

    // Empty state
    emptyMessage?: string;
}

/**
 * Reusable client-side DataTable component with support for:
 * - Pagination, sorting, filtering
 * - Row actions (edit, delete, custom click)
 * - Row selection
 * - Customizable filters
 * - Loading and error states
 */
export function DataTable<T extends { id?: string | number }>({
    columns,
    data,
    className,
    initialPageSize = 15,
    pageSizeOptions = [10, 15, 20, 30, 50, 100],
    searchableColumnIds = [],
    searchPlaceholder = "Cari data...",
    filters = [],
    loading = false,
    error = null,
    onEdit,
    onDelete,
    onRowClick,
    enableSelection = false,
    onRowSelectionChange,
    onColumnVisibilityChange,
    emptyMessage = "Belum ada data",
}: DataTableProps<T>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = React.useState("");
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: 0,
        pageSize: initialPageSize,
    });

    // Augment columns with selection and actions
    const finalColumns = React.useMemo<ColumnDef<T, any>[]>(() => {
        const cols = [...columns];

        // Selection column
        if (enableSelection) {
            cols.unshift({
                id: "__select",
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
                        aria-label="Select all rows"
                        className="cursor-pointer"
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        onChange={(e) => row.toggleSelected(!!e.target.checked)}
                        aria-label={`Select row ${row.id}`}
                        className="cursor-pointer"
                    />
                ),
                enableSorting: false,
                enableHiding: false,
                size: 40,
            } as ColumnDef<T, any>);
        }

        // Actions column
        if (onEdit || onDelete) {
            cols.push({
                id: "__actions",
                header: "Aksi",
                enableSorting: false,
                enableHiding: false,
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        {onEdit && (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(row.original);
                                }}
                                aria-label="Edit"
                                className="size-8"
                            >
                                <Pencil className="size-4" />
                            </Button>
                        )}
                        {onDelete && (
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(row.original);
                                }}
                                aria-label="Delete"
                                className="size-8 text-destructive hover:text-destructive"
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>
                ),
                size: onEdit && onDelete ? 96 : 56,
            } as ColumnDef<T, any>);
        }

        return cols;
    }, [columns, enableSelection, onEdit, onDelete]);

    // Initialize table
    const table = useReactTable({
        data,
        columns: finalColumns,
        filterFns: {
            dateRange: dateRangeFilterFn,
            multiSelect: multiSelectFilterFn,
        },
        state: {
            sorting,
            globalFilter,
            columnFilters,
            rowSelection,
            columnVisibility,
            pagination,
        },
        enableRowSelection: enableSelection,
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onRowSelectionChange: (updater) => {
            const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
            setRowSelection(newSelection);
            onRowSelectionChange?.(newSelection);
        },
        onColumnVisibilityChange: (updater) => {
            const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
            setColumnVisibility(newVisibility);
            onColumnVisibilityChange?.(newVisibility);
        },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        globalFilterFn: (row, _columnId, filterValue) => {
            if (!filterValue) return true;
            const searchValue = String(filterValue).toLowerCase();
            return searchableColumnIds.some((id) => {
                const cellValue = row.getValue(id);
                return String(cellValue).toLowerCase().includes(searchValue);
            });
        },
    });

    const { pageIndex, pageSize } = table.getState().pagination;
    const pageCount = table.getPageCount();
    const canPreviousPage = pageIndex > 0;
    const canNextPage = pageIndex < pageCount - 1;
    const displayRowCount = table.getFilteredRowModel().rows.length;

    return (
        <div className={cn("rounded-xl border bg-card shadow-sm", className)}>
            {/* Toolbar: Search and Filters */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b">
                {/* Global Search */}
                <div className="relative w-full sm:w-64">
                    <Input
                        placeholder={searchPlaceholder}
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pr-8"
                    />
                    {globalFilter && (
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setGlobalFilter("")}
                            className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
                            aria-label="Clear search"
                        >
                            <X className="size-3" />
                        </Button>
                    )}
                </div>

                {/* Custom Filters */}
                {filters.map((filter) => {
                    const column = table.getColumn(filter.id);
                    if (!column) return null;

                    if (filter.type === "select" && filter.options) {
                        const activeValue = String(column.getFilterValue() ?? "");
                        const activeOption = filter.options.find((o) => o.value === activeValue);
                        const displayLabel = activeOption
                            ? activeOption.label
                            : (filter.placeholder || `Semua ${filter.label}`);
                        return (
                            <Select
                                key={filter.id}
                                value={activeValue}
                                onValueChange={(v) => column.setFilterValue(v === "__all__" ? undefined : v)}
                            >
                                <SelectTrigger className="w-auto min-w-[140px]">
                                    <SelectValue placeholder={filter.placeholder || `Semua ${filter.label}`}>
                                        {displayLabel}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">{filter.placeholder || `Semua ${filter.label}`}</SelectItem>
                                    {filter.options.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        );
                    }

                    if (filter.type === "segmented" && filter.options) {
                        return (
                            <div key={filter.id} className="inline-flex rounded-md border overflow-hidden">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => column.setFilterValue(undefined)}
                                    className={cn(
                                        "rounded-none border-0",
                                        !column.getFilterValue() && "bg-muted font-medium"
                                    )}
                                >
                                    Semua
                                </Button>
                                {filter.options.map((option) => {
                                    const isActive = column.getFilterValue() === option.value;
                                    return (
                                        <Button
                                            key={option.value}
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => column.setFilterValue(option.value)}
                                            className={cn(
                                                "rounded-none border-0",
                                                isActive && "bg-muted font-medium"
                                            )}
                                        >
                                            {option.label}
                                        </Button>
                                    );
                                })}
                            </div>
                        );
                    }

                    if (filter.type === "text") {
                        return (
                            <Input
                                key={filter.id}
                                placeholder={filter.placeholder || filter.label}
                                value={String(column.getFilterValue() ?? "")}
                                onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                                className="w-48"
                            />
                        );
                    }

                    if (filter.type === "daterange") {
                        const range = (column.getFilterValue() as DateRangeValue | undefined) ?? { from: "", to: "" };
                        return (
                            <DateRangePicker
                                key={filter.id}
                                value={range}
                                onChange={(v) => column.setFilterValue(v)}
                                placeholder={filter.placeholder || `Filter ${filter.label}`}
                            />
                        );
                    }

                    if (filter.type === "multiselect" && filter.options) {
                        return (
                            <MultiSelectFilter
                                key={filter.id}
                                label={filter.label}
                                placeholder={filter.placeholder}
                                options={filter.options}
                                value={(column.getFilterValue() as string[] | undefined) ?? []}
                                onChange={(v) => column.setFilterValue(v.length ? v : undefined)}
                            />
                        );
                    }

                    return null;
                })}


            </div>

            {/* Table */}
            <div className="overflow-auto">
                <Table className="bg-card">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const canSort = header.column.getCanSort();
                                    const isSorted = header.column.getIsSorted();

                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={cn(canSort && "cursor-pointer select-none")}
                                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                            style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div className="flex items-center gap-2">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {canSort && (
                                                        <span className="text-muted-foreground">
                                                            {isSorted === "asc" ? (
                                                                <ArrowUp className="size-3" />
                                                            ) : isSorted === "desc" ? (
                                                                <ArrowDown className="size-3" />
                                                            ) : (
                                                                <ArrowUpDown className="size-3 opacity-50" />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {error ? (
                            <TableRow>
                                <TableCell
                                    colSpan={finalColumns.length}
                                    className="h-24 text-center text-destructive"
                                >
                                    {error}
                                </TableCell>
                            </TableRow>
                        ) : loading ? (
                            Array.from({ length: pageSize }).map((_, rowIndex) => (
                                <TableRow key={`skeleton-${rowIndex}`}>
                                    {finalColumns.map((col, colIndex) => (
                                        <TableCell key={`skeleton-${rowIndex}-${colIndex}`}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={finalColumns.length} className="h-32 p-0">
                                    <Empty className="border-none rounded-none">
                                        <EmptyHeader>
                                            <EmptyTitle>{emptyMessage}</EmptyTitle>
                                        </EmptyHeader>
                                    </Empty>
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() ? "selected" : undefined}
                                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                                    className={cn(onRowClick && "cursor-pointer")}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm px-4 py-3 border-t bg-muted/30">
                <div className="text-muted-foreground">
                    {enableSelection && Object.keys(rowSelection).length > 0 && (
                        <span className="mr-2">
                            {Object.keys(rowSelection).length} dari {displayRowCount} data dipilih
                        </span>
                    )}
                    <span>
                        Halaman {pageIndex + 1} dari {pageCount}
                    </span>
                  
                </div>
  {/* Record Count */}
                    <div className="ml-auto text-xs text-muted-foreground">
                        {loading ? (
                            <span className="flex items-center gap-1">
                                <Spinner className="size-3" />
                                Memuat...
                            </span>
                        ) : (
                            `${displayRowCount.toLocaleString()} record${displayRowCount !== 1 ? 's' : ''}`
                        )}
                    </div>
                <div className="flex items-center gap-2">
                    {/* Page Size Selector */}
                    <Select
                        value={String(pageSize)}
                        onValueChange={(v) => table.setPageSize(Number(v))}
                    >
                        <SelectTrigger className="h-8 w-auto text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {pageSizeOptions.map((size) => (
                                <SelectItem key={size} value={String(size)} className="text-xs">
                                    {size} / halaman
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Pagination Buttons */}
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!canPreviousPage || loading}
                            aria-label="First page"
                            className="size-8"
                        >
                            <ChevronsLeft className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => table.previousPage()}
                            disabled={!canPreviousPage || loading}
                            aria-label="Previous page"
                            className="size-8"
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => table.nextPage()}
                            disabled={!canNextPage || loading}
                            aria-label="Next page"
                            className="size-8"
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => table.setPageIndex(pageCount - 1)}
                            disabled={!canNextPage || loading}
                            aria-label="Last page"
                            className="size-8"
                        >
                            <ChevronsRight className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── MultiSelect Filter ───────────────────────────────────────────────────────

function MultiSelectFilter({
    label,
    placeholder,
    options,
    value,
    onChange,
}: {
    label: string;
    placeholder?: string;
    options: { value: string; label: string }[];
    value: string[];
    onChange: (v: string[]) => void;
}) {
    const [open, setOpen] = React.useState(false);

    function toggle(v: string) {
        if (value.includes(v)) {
            onChange(value.filter((x) => x !== v));
        } else {
            onChange([...value, v]);
        }
    }

    const hasValue = value.length > 0;
    const triggerLabel = hasValue
        ? value.length === 1
            ? options.find((o) => o.value === value[0])?.label ?? value[0]
            : `${label}: ${value.length} dipilih`
        : (placeholder ?? `Semua ${label}`);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "h-8 gap-1.5 px-3 font-normal text-sm",
                            hasValue ? "border-primary/60 bg-primary/5" : "text-muted-foreground"
                        )}
                    />
                }
            >
                <span className="truncate max-w-[180px]">{triggerLabel}</span>
                <ChevronDown className="size-3.5 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start" side="bottom">
                <Command>
                    <CommandInput placeholder={`Cari ${label.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = value.includes(option.value);
                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => toggle(option.value)}
                                        data-checked={isSelected}
                                    >
                                        <div className={cn(
                                            "mr-2 flex size-4 shrink-0 items-center justify-center rounded border",
                                            isSelected
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-muted-foreground/40"
                                        )}>
                                            {isSelected && <Check className="size-3" />}
                                        </div>
                                        <span className="truncate">{option.label}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                        {hasValue && (
                            <>
                                <div className="h-px bg-border mx-1" />
                                <CommandGroup>
                                    <CommandItem
                                        value="__clear__"
                                        onSelect={() => { onChange([]); setOpen(false); }}
                                        className="text-muted-foreground text-xs justify-center"
                                    >
                                        Hapus pilihan
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default DataTable;
