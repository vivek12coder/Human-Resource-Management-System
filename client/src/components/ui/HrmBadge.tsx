import React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

interface HrmBadgeProps {
    variant?: BadgeVariant;
    size?: BadgeSize;
    children: React.ReactNode;
    className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-secondary text-secondary-foreground',
    primary: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

const sizeClasses: Record<BadgeSize, string> = {
    sm: 'text-[10px] px-1.5 py-0 h-4',
    md: 'text-xs px-2 py-0.5',
};

export const HrmBadge = ({ variant = 'default', size = 'md', children, className }: HrmBadgeProps) => (
    <Badge
        variant="outline"
        className={cn(variantClasses[variant], sizeClasses[size], 'font-medium border', className)}
    >
        {children}
    </Badge>
);
