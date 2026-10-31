import type { ComponentType, ReactNode } from 'react';

export type DataTableProps = {
  columns: any[];
  data?: any[];
  getRowId?: (row: any, index: number) => string | number;
  title?: ReactNode;
  description?: ReactNode;
  toolbar?: ReactNode;
  ariaLabel?: string;
  showIndex?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  errorTitle?: ReactNode;
  errorBody?: ReactNode;
  empty?: { icon?: ComponentType<any>; title?: ReactNode; body?: ReactNode; action?: ReactNode };
  loadingRows?: number;
  onRowClick?: (row: any, event: any) => void;
  isRowActive?: (row: any) => boolean;
  expandedRows?: Set<any>;
  renderExpanded?: (props: { row: any }) => ReactNode;
  selected?: Array<string | number>;
  onSelectionChange?: (ids: Array<any>) => void;
  pagination?: false | { page: number; pageSize: number; total: number; onPageChange: (page: number) => void; onPageSizeChange?: (size: number) => void };
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  footer?: ReactNode;
  mobileInset?: string;
  className?: string;
};

export declare function DataTable(props: DataTableProps): JSX.Element;
export declare function StatusPill(props: { tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; children?: ReactNode; className?: string }): JSX.Element;
