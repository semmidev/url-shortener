import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Columns3,
  RefreshCcw,
  SlidersHorizontal,
  Inbox,
  CheckSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export function DataTableColumnHeader({
  column,
  title,
  className,
  sortBy,
  sortDirection,
  onSortChange,
}) {
  const isSortable = column?.getCanSort() || !!onSortChange;
  if (!isSortable) {
    return (
      <div className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", className)}>
        {title}
      </div>
    );
  }

  const field = column?.id || column?.accessorKey;
  const isCurrentSort = sortBy ? sortBy === field : column?.getIsSorted();
  const dir = sortDirection ? sortDirection : (isCurrentSort === "desc" ? "desc" : isCurrentSort === "asc" ? "asc" : false);

  const handleClick = () => {
    if (onSortChange && field) {
      onSortChange(field);
    } else if (column?.toggleSorting) {
      column.toggleSorting(column.getIsSorted() === "asc");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={handleClick}
      className={cn(
        "-ml-2.5 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-accent/60 select-none group",
        className
      )}
    >
      <span>{title}</span>
      {dir === "asc" ? (
        <ArrowUp className="ml-1.5 size-3.5 text-primary shrink-0" />
      ) : dir === "desc" ? (
        <ArrowDown className="ml-1.5 size-3.5 text-primary shrink-0" />
      ) : (
        <ArrowUpDown className="ml-1.5 size-3.5 text-muted-foreground/40 opacity-70 group-hover:opacity-100 shrink-0 transition-opacity" />
      )}
    </Button>
  );
}

export function DataTable({
  columns: userColumns,
  data = [],
  isLoading = false,
  // Row selection
  enableSelection = false,
  selectedRowIds = [],
  onSelectionChange,
  bulkActions = [],
  // Pagination
  page = 1,
  pageSize = 10,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100, 250],
  // Search & Rich Filters
  search = "",
  onSearchChange,
  searchPlaceholder = "Search records...",
  filters = [], // Array of { id, label, value, options: [{ label, value }], onChange }
  // Sorting
  sortBy,
  sortDirection,
  onSortChange,
  // Helper callbacks & customization
  getRowId = (row) => row.id,
  onRefresh,
  emptyMessage = "No data found matching criteria.",
  className,
}) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState({});

  const columns = React.useMemo(() => {
    if (!enableSelection) return userColumns;

    const selectColumn = {
      id: "select",
      header: ({ table }) => {
        const isAllSelected = table.getIsAllPageRowsSelected();
        const isSomeSelected = table.getIsSomePageRowsSelected();
        return (
          <div className="flex items-center justify-center px-1">
            <Checkbox
              checked={isAllSelected || (isSomeSelected ? "indeterminate" : false)}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all rows"
            />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="flex items-center justify-center px-1">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    };

    return [selectColumn, ...userColumns];
  }, [enableSelection, userColumns]);

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      columnVisibility,
    },
    getRowId: (row, index) => {
      const customId = getRowId(row);
      return customId !== undefined && customId !== null ? String(customId) : String(index);
    },
    enableRowSelection: enableSelection,
    onRowSelectionChange: (updater) => {
      const nextState = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(nextState);
      if (onSelectionChange) {
        const selectedIds = Object.keys(nextState).filter((key) => nextState[key]);
        const selectedObjects = data.filter((row, idx) => {
          const id = String(getRowId(row) ?? idx);
          return nextState[id];
        });
        onSelectionChange(selectedIds, selectedObjects);
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  const selectedRowsList = React.useMemo(() => {
    return table.getSelectedRowModel().rows.map((r) => r.original);
  }, [table, rowSelection]);

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  const calculatedTotal = totalCount !== undefined ? totalCount : data.length;
  const totalPages = Math.max(1, Math.ceil(calculatedTotal / pageSize));
  const startItem = calculatedTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, calculatedTotal);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Top Toolbar: Search, Rich Filters, Refresh, Column Visibility */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between shadow-xs">
        {/* Left side: Search & Custom Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {onSearchChange && (
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm rounded-lg bg-background border-border focus-visible:ring-1 focus-visible:ring-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Custom Filters */}
          {filters.map((filter) => (
            <Select
              key={filter.id}
              value={filter.value}
              onValueChange={filter.onChange}
            >
              <SelectTrigger className="h-9 min-w-[130px] w-auto bg-background text-xs font-medium border-border">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-muted-foreground" />
                  <span>{filter.label}:</span>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent align="start">
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        {/* Right side: Refresh & Column Visibility */}
        <div className="flex items-center gap-2 justify-end">
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-9 px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-background border-border"
              title="Refresh table"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          )}

          {/* Column Visibility Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 gap-1.5 text-xs font-medium bg-background border-border"
              >
                <Columns3 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                .map((column) => {
                  const rawHeader = column.columnDef.header;
                  const headerText =
                    typeof rawHeader === "string"
                      ? rawHeader
                      : column.id
                          .replace(/_/g, " ")
                          .replace(/([a-z])([A-Z])/g, "$1 $2")
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="text-xs"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {headerText}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Floating/Inline Bulk Actions Bar */}
      <AnimatePresence>
        {enableSelection && selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2 text-foreground font-medium">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span>
                <strong className="text-primary">{selectedCount}</strong> {selectedCount === 1 ? "row" : "rows"} selected
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRowSelection({})}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear selection
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {bulkActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={idx}
                    type="button"
                    variant={action.variant || "default"}
                    size="sm"
                    onClick={() => action.onClick(selectedRowsList)}
                    disabled={action.disabled}
                    className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Table Container */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs relative">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="h-11 px-4 text-xs">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {isLoading ? (
                // Skeleton Rows
                Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, rIdx) => (
                  <TableRow key={rIdx} className="animate-pulse">
                    {table.getVisibleFlatColumns().map((col, cIdx) => (
                      <TableCell key={cIdx} className="py-4 px-4">
                        <div className="h-4 bg-muted/70 rounded-md w-3/4" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-accent/40 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3.5 align-middle text-xs">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-48 text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 rounded-full bg-muted/50 border border-border">
                        <Inbox className="w-6 h-6 text-muted-foreground/60" />
                      </div>
                      <p className="font-medium text-sm text-foreground">{emptyMessage}</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Try adjusting your search query or filter parameters to find what you need.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="px-1 py-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div>
          Showing <span className="font-semibold text-foreground">{startItem}</span> to{" "}
          <span className="font-semibold text-foreground">{endItem}</span> of{" "}
          <span className="font-semibold text-foreground">{calculatedTotal}</span> entries
        </div>

        <div className="flex items-center gap-4">
          {/* Rows per page selector */}
          {onPageSizeChange && (
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => onPageSizeChange(Number(val))}
              >
                <SelectTrigger className="h-8 w-16 text-xs bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Page Navigation Buttons */}
          {onPageChange && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-background border-border cursor-pointer"
                onClick={() => onPageChange(1)}
                disabled={page <= 1 || isLoading}
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-background border-border cursor-pointer"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || isLoading}
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              <span className="px-2 font-medium text-foreground">
                {page} / {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-background border-border cursor-pointer"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-background border-border cursor-pointer"
                onClick={() => onPageChange(totalPages)}
                disabled={page >= totalPages || isLoading}
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
