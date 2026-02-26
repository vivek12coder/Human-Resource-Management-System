import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './table';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

interface ColumnDef<T> {
    key: string;
    header: string;
    render?: (row: T) => React.ReactNode;
}

interface HrmTableProps<T extends object> {
    data: T[];
    columns: ColumnDef<T>[];
    isLoading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    className?: string;
}

export function HrmTable<T extends object>({
    data,
    columns,
    isLoading,
    emptyMessage = 'No data found',
    onRowClick,
    className,
}: HrmTableProps<T>) {
    return (
        <div className={cn('rounded-xl border border-border overflow-hidden bg-card shadow-sm', className)}>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            {columns.map((col) => (
                                <TableHead key={col.key} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    {col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    {columns.map((col) => (
                                        <TableCell key={col.key}>
                                            <Skeleton className="h-4 w-full max-w-[200px]" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="text-center text-sm text-muted-foreground py-12"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-3xl">📭</span>
                                        <span>{emptyMessage}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, rowIdx) => (
                                <TableRow
                                    key={rowIdx}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    className={cn(
                                        onRowClick && 'cursor-pointer',
                                        'transition-colors'
                                    )}
                                >
                                    {columns.map((col) => (
                                        <TableCell key={col.key} className="align-middle">
                                            {col.render
                                                ? col.render(row)
                                                : String((row as Record<string, unknown>)[col.key] ?? '-')}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
