import React from 'react';
import { cn } from '@/lib/utils';

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const baseClasses = 'w-full border-collapse bg-white rounded-lg overflow-hidden';
    
    const variants = {
      default: 'shadow-corporate-sm',
      striped: 'shadow-corporate-sm',
      bordered: 'border border-secondary-200',
    };

    const sizes = {
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
    };

    return (
      <div className="overflow-x-auto">
        <table
          ref={ref}
          className={cn(
            baseClasses,
            variants[variant],
            sizes[size],
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Table.displayName = 'Table';

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn('bg-secondary-50 border-b border-secondary-200', className)}
        {...props}
      />
    );
  }
);

TableHeader.displayName = 'TableHeader';

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  striped?: boolean;
}

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, striped = false, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={cn(
          'divide-y divide-secondary-100',
          striped && 'divide-y-0',
          className
        )}
        {...props}
      />
    );
  }
);

TableBody.displayName = 'TableBody';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
  selected?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, hover = true, selected = false, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          'border-b border-secondary-100 last:border-b-0',
          hover && 'hover:bg-secondary-50 transition-colors duration-150',
          selected && 'bg-primary-50 border-primary-200',
          className
        )}
        {...props}
      />
    );
  }
);

TableRow.displayName = 'TableRow';

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable = false, sortDirection, onSort, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          'px-4 py-3 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wider',
          sortable && 'cursor-pointer select-none hover:bg-secondary-100',
          className
        )}
        onClick={sortable ? onSort : undefined}
        {...props}
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          {sortable && (
            <div className="flex flex-col">
              <svg
                className={cn(
                  'w-3 h-3',
                  sortDirection === 'asc' ? 'text-primary-600' : 'text-secondary-400'
                )}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
              <svg
                className={cn(
                  'w-3 h-3 -mt-1',
                  sortDirection === 'desc' ? 'text-primary-600' : 'text-secondary-400'
                )}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
              </svg>
            </div>
          )}
        </div>
      </th>
    );
  }
);

TableHead.displayName = 'TableHead';

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right';
  numeric?: boolean;
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = 'left', numeric = false, ...props }, ref) => {
    const alignments = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    };

    return (
      <td
        ref={ref}
        className={cn(
          'px-4 py-3 text-secondary-700',
          alignments[align],
          numeric && 'font-mono',
          className
        )}
        {...props}
      />
    );
  }
);

TableCell.displayName = 'TableCell';

export interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <tfoot
        ref={ref}
        className={cn('bg-secondary-50 border-t border-secondary-200', className)}
        {...props}
      />
    );
  }
);

TableFooter.displayName = 'TableFooter';

export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell, 
  TableFooter 
};
