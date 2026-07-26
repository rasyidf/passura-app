"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { Button } from "./button";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
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
    Loader2
} from "lucide-react";
import {
    ColumnDef,
    ColumnFiltersState,
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

/**
 * Filter configuration for DataTable columns
 */
export interface DataTableFilterOption {
    id: string; // column accessorKey
    label: string; // UI label
    type: "select" | "segmented" | "text";
    options?: { value: string; label: string }[]; // for select/segmented
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
                        return (
                            <Select
                                key={filter.id}
                                value={String(column.getFilterValue() ?? "")}
                                onValueChange={(v) => column.setFilterValue(v === "__all__" ? undefined : v)}
                            >
                                <SelectTrigger className="h-9 w-auto min-w-[140px]">
                                    <SelectValue placeholder={filter.placeholder || `Semua ${filter.label}`} />
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

                    return null;
                })}

                {/* Record Count */}
                <div className="ml-auto text-xs text-muted-foreground">
                    {loading ? (
                        <span className="flex items-center gap-1">
                            <Loader2 className="size-3 animate-spin" />
                            Memuat...
                        </span>
                    ) : (
                        `${displayRowCount.toLocaleString()} record${displayRowCount !== 1 ? 's' : ''}`
                    )}
                </div>
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
                                            <div className="h-4 w-full rounded bg-muted animate-pulse" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={finalColumns.length}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {emptyMessage}
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

export default DataTable;
