import { Fragment, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { useResponsive } from '@rentify/shared/hooks/useResponsive';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';

// English fallbacks keep the table readable where no TranslationProvider is mounted (unit tests)
const FALLBACK = {
  showing: 'Showing {{from}}–{{to}} of {{total}}',
  rowsPerPage: 'Rows per page',
  pageOf: 'Page {{page}} of {{pages}}',
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  errorTitle: 'This list could not be loaded',
  errorBody: 'Check your connection, then try again.',
  retry: 'Try again',
  emptyTitle: 'Nothing here yet',
  emptyBody: 'Records will show here as soon as there are some.',
  sortBy: 'Sort by {{column}}',
  loading: 'Loading…',
};

function useTableText() {
  const { t } = useTranslation() || {};
  return (key, params = {}) => {
    const fullKey = `merchant.table.${key}`;
    const message = typeof t === 'function' ? t(fullKey, params) : fullKey;
    if (message !== fullKey) return message;
    return FALLBACK[key].replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) => params[name] ?? match);
  };
}

const ALIGN = { right: 'text-right justify-end', center: 'text-center justify-center', left: 'text-left' };
const alignOf = (meta) => ALIGN[meta.align] || ALIGN.left;
const metaOf = (column) => column.columnDef.meta || {};
const labelOf = (column) => {
  const meta = metaOf(column);
  if (meta.label) return meta.label;
  return typeof column.columnDef.header === 'string' ? column.columnDef.header : '';
};
const isSelectColumn = (column) => column.id === 'select' || metaOf(column).mobile === 'select';
const isActionsColumn = (column) => metaOf(column).mobile === 'actions' || /actions/.test(column.id);

/**
 * Record table for merchant list screens: one row per record, a numbered
 * column, sortable headers, status pills and a records/pages footer. Below
 * 768px every row becomes a stacked card with labelled fields.
 *
 * Column meta: { label, align, sortable, headerClassName, cellClassName,
 *   mobile: 'primary' | 'trailing' | 'meta' (default) | 'badge' | 'actions' | 'hidden',
 *   mobileCell(row), mobileHideLabel, mobilePrefix }.
 * `mobileInset` indents the phone card's detail lines to sit under the title (e.g. 'pl-14' past a thumbnail).
 * Pagination is client side unless `pagination.onPageChange` is passed (page is 0-based).
 */
export function DataTable({
  columns,
  data = [],
  getRowId,
  title,
  description,
  toolbar,
  ariaLabel,
  showIndex = true,
  isLoading = false,
  isError = false,
  onRetry,
  errorTitle,
  errorBody,
  empty,
  loadingRows = 6,
  onRowClick,
  isRowActive,
  expandedRows,
  renderExpanded,
  selected,
  onSelectionChange,
  pagination,
  pageSizeOptions = [10, 25, 50],
  defaultPageSize = 10,
  footer,
  mobileInset = '',
  className = '',
}) {
  const text = useTableText();
  const sizeLabelId = useId();
  const { isMobile } = useResponsive();
  // Wide tables (tablets, narrow laptops) stack into cards instead of scrolling sideways
  const sectionRef = useRef(null);
  const tableWidth = useRef(0);
  const [tooWide, setTooWide] = useState(false);
  const manual = Boolean(pagination?.onPageChange);
  const paginate = pagination !== false;
  const [sorting, setSorting] = useState([]);
  const [clientPage, setClientPage] = useState({ pageIndex: 0, pageSize: defaultPageSize });

  const rowId = (row, index) => String(getRowId ? getRowId(row, index) : row.id ?? row.key ?? index);
  const rowSelection = useMemo(
    () => Object.fromEntries((selected || []).map((id) => [String(id), true])),
    [selected],
  );

  const table = useReactTable({
    data,
    columns,
    getRowId: rowId,
    state: {
      sorting,
      rowSelection,
      ...(paginate && !manual ? { pagination: clientPage } : {}),
    },
    enableRowSelection: Boolean(onSelectionChange),
    enableSorting: true,
    enableSortingRemoval: true,
    onSortingChange: setSorting,
    onPaginationChange: setClientPage,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      // Keep the caller's id types (numbers stay numbers)
      const ids = data.map((row, index) => [rowId(row, index), row.id ?? row.key ?? index]);
      onSelectionChange?.(ids.filter(([key]) => next[key]).map(([, id]) => id));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(paginate && !manual ? { getPaginationRowModel: getPaginationRowModel(), autoResetPageIndex: true } : {}),
    manualPagination: manual,
  });

  const rows = table.getRowModel().rows;

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || isMobile) return undefined;
    const measure = () => {
      const wrap = section.querySelector('[data-table-scroll]');
      if (wrap && wrap.scrollWidth > wrap.clientWidth + 1) {
        tableWidth.current = wrap.scrollWidth;
        setTooWide(true);
      } else if (!wrap && section.clientWidth >= tableWidth.current) {
        setTooWide(false);
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    return () => observer.disconnect();
  }, [isMobile, tooWide, rows.length, columns]);
  const leafColumns = table.getVisibleLeafColumns();
  const colSpan = leafColumns.length + (showIndex ? 1 : 0);

  const total = manual ? pagination.total ?? data.length : data.length;
  const pageIndex = manual ? pagination.page ?? 0 : clientPage.pageIndex;
  const pageSize = manual ? pagination.pageSize ?? defaultPageSize : clientPage.pageSize;
  const pageCount = paginate ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const firstNumber = paginate ? pageIndex * pageSize : 0;
  const goTo = (index) => {
    const next = Math.min(Math.max(index, 0), pageCount - 1);
    if (manual) pagination.onPageChange(next);
    else setClientPage((current) => ({ ...current, pageIndex: next }));
  };
  const setSize = (size) => {
    if (manual) pagination.onPageSizeChange?.(size);
    else setClientPage({ pageIndex: 0, pageSize: size });
  };
  const isExpanded = (row) => Boolean(renderExpanded && expandedRows?.has?.(row.id ?? row.key));

  const handleRowClick = (row, event) => {
    if (!onRowClick) return;
    if (event.target.closest('button, a, input, select, textarea, label, [role="checkbox"], [data-action-menu]')) return;
    onRowClick(row.original, event);
  };
  const handleRowKey = (row, event) => {
    if (!onRowClick || event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row.original, event);
    }
  };

  const header = (title || description || toolbar) && (
    <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
      <div className="min-w-0 sm:shrink-0">
        {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {/* The toolbar takes the rest of the header, so a search field can grow into it */}
      {toolbar && <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">{toolbar}</div>}
    </div>
  );

  const stateBlock = (() => {
    if (isLoading) {
      return (
        <div role="status" aria-live="polite" className="divide-y divide-border/60">
          <span className="sr-only">{text('loading')}</span>
          {Array.from({ length: loadingRows }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-4 py-4 sm:px-6">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
              <Skeleton className="hidden h-9 w-24 rounded-lg md:block" />
            </div>
          ))}
        </div>
      );
    }
    if (isError) {
      return (
        <div role="alert" className="flex flex-col items-center gap-3 px-4 py-14 text-center">
          <AlertCircle className="h-9 w-9 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">{errorTitle || text('errorTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{errorBody || text('errorBody')}</p>
          </div>
          {onRetry && (
            <Button variant="outline" className="h-11" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {text('retry')}
            </Button>
          )}
        </div>
      );
    }
    if (!data.length) {
      const EmptyIcon = empty?.icon || Inbox;
      return (
        <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
          <EmptyIcon className="h-9 w-9 text-muted-foreground/50" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">{empty?.title || text('emptyTitle')}</p>
            {(empty?.body ?? text('emptyBody')) && (
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{empty?.body ?? text('emptyBody')}</p>
            )}
          </div>
          {empty?.action}
        </div>
      );
    }
    return null;
  })();

  const sortButton = (column, label) => {
    const direction = column.getIsSorted();
    const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ChevronsUpDown;
    return (
      <button
        type="button"
        onClick={column.getToggleSortingHandler()}
        className="-mx-1 inline-flex min-h-8 items-center gap-1 rounded-md px-1 uppercase tracking-wide hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rentify-focus-ring-color)]"
        aria-label={text('sortBy', { column: label })}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${direction ? 'text-foreground' : 'opacity-50'}`} aria-hidden="true" />
      </button>
    );
  };

  const desktopTable = (
    <div className="relative w-full overflow-x-auto" data-table-scroll>
      <table className="w-full border-collapse text-sm" aria-label={ariaLabel || title}>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b border-border/60 bg-muted/40">
              {showIndex && (
                <th scope="col" className="w-12 py-3 pl-4 pr-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pl-5">
                  #
                </th>
              )}
              {group.headers.map((head) => {
                const meta = metaOf(head.column);
                const sortable = head.column.getCanSort() && meta.sortable;
                const label = labelOf(head.column);
                const sorted = head.column.getIsSorted();
                return (
                  <th
                    key={head.id}
                    scope="col"
                    aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`whitespace-nowrap px-3 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${alignOf(meta)} ${meta.headerClassName || ''}`}
                  >
                    {head.isPlaceholder
                      ? null
                      : sortable
                        ? sortButton(head.column, label)
                        : flexRender(head.column.columnDef.header, head.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row, index) => {
            const open = isExpanded(row.original);
            const active = isRowActive?.(row.original) || open;
            return (
              <Fragment key={row.id}>
                <tr
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-expanded={renderExpanded ? open : undefined}
                  onClick={(event) => handleRowClick(row, event)}
                  onKeyDown={(event) => handleRowKey(row, event)}
                  className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rentify-focus-ring-color)] ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${active ? 'bg-primary/[0.05]' : 'hover:bg-muted/40'} data-[state=selected]:bg-primary/[0.05]`}
                >
                  {showIndex && (
                    <td className="py-3.5 pl-4 pr-2 align-middle text-sm tabular-nums text-muted-foreground sm:pl-5">
                      {firstNumber + index + 1}
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => {
                    const meta = metaOf(cell.column);
                    return (
                      <td
                        key={cell.id}
                        className={`px-3 py-3.5 align-middle ${alignOf(meta)} ${meta.cellClassName || ''}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
                {open && (
                  <tr className="bg-muted/30">
                    <td colSpan={colSpan} className="p-0">
                      {renderExpanded({ row })}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Phone card: title + trailing value, one muted line of details, then pills and actions
  const STRIP_ALIGN = '[&_.justify-end]:!justify-start [&_.justify-center]:!justify-start [&_.text-right]:!text-left [&_.text-center]:!text-left';
  const mobileValue = (cell) => {
    const meta = metaOf(cell.column);
    return meta.mobileCell ? meta.mobileCell(cell.row.original) : flexRender(cell.column.columnDef.cell, cell.getContext());
  };
  const mobileCards = (
    <ul className="divide-y divide-border/60" aria-label={ariaLabel || title}>
      {rows.map((row) => {
        const cells = row.getVisibleCells().filter((cell) => metaOf(cell.column).mobile !== 'hidden');
        const selectCell = cells.find((cell) => isSelectColumn(cell.column));
        const actionCell = cells.find((cell) => isActionsColumn(cell.column));
        const rest = cells.filter((cell) => cell !== selectCell && cell !== actionCell);
        const primary = rest.find((cell) => metaOf(cell.column).mobile === 'primary') || rest[0];
        const role = (cell) => metaOf(cell.column).mobile || 'meta';
        const trailing = rest.filter((cell) => cell !== primary && role(cell) === 'trailing');
        const badges = rest.filter((cell) => cell !== primary && role(cell) === 'badge');
        // A mobileCell that returns null drops that detail (e.g. no last order yet)
        const details = rest
          .filter((cell) => cell !== primary && role(cell) === 'meta')
          .map((cell) => ({ cell, value: mobileValue(cell) }))
          .filter(({ value }) => value !== null && value !== undefined && value !== '');
        // Without pills the actions fit on the title line
        const inlineActions = actionCell && badges.length === 0;
        const open = isExpanded(row.original);
        const active = isRowActive?.(row.original) || open;
        return (
          <li key={row.id} className={`transition-colors ${active ? 'bg-primary/[0.05]' : ''}`}>
            <div
              className={`flex items-start gap-3 px-4 py-3.5 ${onRowClick ? 'cursor-pointer active:bg-muted/40' : ''}`}
              tabIndex={onRowClick ? 0 : undefined}
              aria-expanded={renderExpanded ? open : undefined}
              onClick={(event) => handleRowClick(row, event)}
              onKeyDown={(event) => handleRowKey(row, event)}
            >
              {selectCell && <div className="pt-0.5">{flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}</div>}
              <div className="min-w-0 flex-1">
                <div className={`flex justify-between gap-3 ${inlineActions ? 'items-center' : 'items-start'}`}>
                  <div className="min-w-0 flex-1">{primary && flexRender(primary.column.columnDef.cell, primary.getContext())}</div>
                  {trailing.length > 0 && (
                    <div className={`shrink-0 space-y-0.5 text-right text-sm font-semibold text-foreground [&_*]:!justify-end ${inlineActions ? '' : 'pt-0.5'}`}>
                      {trailing.map((cell) => <div key={cell.id}>{mobileValue(cell)}</div>)}
                    </div>
                  )}
                  {inlineActions && (
                    <div className="-my-1.5 -mr-2 shrink-0" data-action-menu>{mobileValue(actionCell)}</div>
                  )}
                </div>
                <div className={mobileInset}>
                  {details.length > 0 && (
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-5 text-muted-foreground">
                      {details.map(({ cell, value }, index) => {
                        const meta = metaOf(cell.column);
                        return (
                          <Fragment key={cell.id}>
                            {index > 0 && <span aria-hidden="true">·</span>}
                            <span className={`inline-flex min-w-0 items-center gap-1 ${STRIP_ALIGN}`}>
                              {!meta.mobileHideLabel && <span className="sr-only">{labelOf(cell.column)}:</span>}
                              {meta.mobilePrefix}
                              {value}
                            </span>
                          </Fragment>
                        );
                      })}
                    </p>
                  )}
                  {badges.length > 0 && (
                    <div className="mt-2.5 flex items-end justify-between gap-2">
                      <div className={`flex min-w-0 flex-1 flex-wrap items-center gap-1.5 [&>*]:!w-auto [&>*]:max-w-full ${STRIP_ALIGN}`}>
                        {badges.map((cell) => <Fragment key={cell.id}>{mobileValue(cell)}</Fragment>)}
                      </div>
                      {actionCell && (
                        <div className="-my-1.5 -mr-2 ml-auto shrink-0" data-action-menu>
                          {mobileValue(actionCell)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {open && <div className="bg-muted/30">{renderExpanded({ row })}</div>}
          </li>
        );
      })}
    </ul>
  );

  const from = total ? firstNumber + 1 : 0;
  const to = Math.min(firstNumber + (manual ? data.length : rows.length), total);
  const pager = paginate && !stateBlock && (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground sm:px-6">
      <p aria-live="polite" className="whitespace-nowrap text-[13px] sm:text-sm">{text('showing', { from, to, total })}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="hidden items-center gap-2 sm:flex">
          <span id={sizeLabelId} className="whitespace-nowrap">{text('rowsPerPage')}</span>
          <Select value={String(pageSize)} onValueChange={(value) => setSize(Number(value))}>
            <SelectTrigger className="h-11 w-20 md:h-9" aria-labelledby={sizeLabelId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="hidden whitespace-nowrap tabular-nums sm:inline">{text('pageOf', { page: pageIndex + 1, pages: pageCount })}</span>
        <div className="flex items-center gap-1">
          {[
            { label: text('firstPage'), Icon: ChevronsLeft, to: 0, disabled: pageIndex === 0, wide: true },
            { label: text('previousPage'), Icon: ChevronLeft, to: pageIndex - 1, disabled: pageIndex === 0 },
            { label: text('nextPage'), Icon: ChevronRight, to: pageIndex + 1, disabled: pageIndex >= pageCount - 1 },
            { label: text('lastPage'), Icon: ChevronsRight, to: pageCount - 1, disabled: pageIndex >= pageCount - 1, wide: true },
          ].map(({ label, Icon, to: target, disabled, wide }) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="icon"
              className={`md:h-9 md:w-9 ${wide ? 'hidden sm:inline-flex' : ''}`}
              aria-label={label}
              disabled={disabled}
              onClick={() => goTo(target)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      className={`overflow-hidden rounded-2xl border border-border/70 bg-card ${className}`}
      aria-busy={isLoading || undefined}
    >
      {header}
      {stateBlock || (isMobile || tooWide ? mobileCards : desktopTable)}
      {pager}
      {footer && !isLoading && !isError && (
        <div className="border-t border-border/60 px-4 py-3 sm:px-6">{footer}</div>
      )}
    </section>
  );
}

export default DataTable;
