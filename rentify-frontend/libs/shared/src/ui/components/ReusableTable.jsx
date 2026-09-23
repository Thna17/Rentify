// Enhanced ReusableTable.tsx
import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLoader,
  IconPackage,
  IconSearch,
  IconX,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { useTranslation } from '@rentify/utils';

import { Badge } from '@rentify/shared/ui/badge';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rentify/shared/ui/table';
import { Card } from '@rentify/shared/ui/card';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';

export function ReusableTable({
  data,
  columns,
  isLoading = false,
  isError = false,
  totalItems = 0,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  // Selection
  selected = [],
  onSelectionChange,
  // Expansion
  renderSubComponent,
  expandedRows = new Set(),
  onRowClick,
  // Custom empty state
  emptyStateIcon = IconPackage,
  emptyStateTitle = 'No items found',
  emptyStateDescription = 'Try adjusting your filters or search terms',
  // Custom loading
  loadingSkeletonRows = 5,
  isMobile = false,
}) {
  const { t } = useTranslation();
  const [rowSelection, setRowSelection] = React.useState({});

  // Sync row selection with external selected state
  React.useEffect(() => {
    const newRowSelection = {};
    data.forEach((item, index) => {
      if (selected.includes(item.id)) {
        newRowSelection[index] = true;
      }
    });
    setRowSelection(newRowSelection);
  }, [selected, data]);

  const handleRowSelectionChange = (updater) => {
    const newRowSelection =
      typeof updater === 'function' ? updater(rowSelection) : updater;
    setRowSelection(newRowSelection);

    const selectedIds = Object.keys(newRowSelection)
      .filter((index) => newRowSelection[index])
      .map((index) => data[parseInt(index)]?.id)
      .filter((id) => id !== undefined);

    onSelectionChange?.(selectedIds);
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: handleRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const handleRowClick = (row, event) => {
    // Don't trigger row click if clicking on select checkbox or actions
    if (event.target.closest('input[type="checkbox"]') || 
        event.target.closest('[data-action-menu]')) {
      return;
    }
    
    onRowClick?.(row.original, event);
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="rounded-md">
          <Table>
            <TableHeader>
              {columns.map((column, index) => (
                <TableHead key={index}>
                  <Skeleton className="h-4 w-full" />
                </TableHead>
              ))}
            </TableHeader>
            <TableBody>
              {Array.from({ length: loadingSkeletonRows }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 text-center">
        <IconAlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Error loading data</h3>
        <p className="text-muted-foreground">
          There was an error loading the data. Please try again.
        </p>
      </Card>
    );
  }

  const EmptyStateIcon = emptyStateIcon;

  return (
    <div className="space-y-4">
      {/* Table */}
      <Card className="overflow-hidden">
        <div className="rounded-md">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/50 hover:bg-muted/50"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="h-12"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const isExpanded = expandedRows.has(row.original.id);
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        data-state={row.getIsSelected() && 'selected'}
                        className={`
                          hover:bg-muted/30 cursor-pointer transition-colors
                          ${isExpanded ? 'bg-muted/20' : ''}
                        `}
                        onClick={(e) => handleRowClick(row, e)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isExpanded && renderSubComponent && (
                        <TableRow className="bg-muted/10">
                          <TableCell
                            colSpan={columns.length}
                            className="p-0 border-b"
                          >
                            {renderSubComponent({ row })}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex flex-col items-center justify-center py-8">
                      <EmptyStateIcon className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground font-medium mb-2">
                        {emptyStateTitle}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {emptyStateDescription}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {(onPageChange || onRowsPerPageChange) && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 gap-4">
            {onRowsPerPageChange && (
              <div className="flex items-center text-muted-foreground text-sm">
                Rows per page
                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={(value) =>
                    onRowsPerPageChange(parseInt(value))
                  }
                >
                  <SelectTrigger className="w-20 ml-2">
                    <SelectValue placeholder={rowsPerPage} />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="text-sm font-medium">
              Showing {page * rowsPerPage + 1} to{' '}
              {Math.min((page + 1) * rowsPerPage, totalItems)} of {totalItems}{' '}
              entries
            </div>

            {onPageChange && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(0)}
                  disabled={page === 0}
                  className="hidden sm:flex"
                >
                  <IconChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 0}
                >
                  <IconChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(page + 1)}
                  disabled={(page + 1) * rowsPerPage >= totalItems}
                >
                  <IconChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onPageChange(Math.ceil(totalItems / rowsPerPage) - 1)
                  }
                  disabled={(page + 1) * rowsPerPage >= totalItems}
                  className="hidden sm:flex"
                >
                  <IconChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}