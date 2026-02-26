import React from 'react';
import { Card } from './card';
import { cn } from '@/lib/utils';

interface HrmCardProps extends React.ComponentProps<'div'> {
    variant?: 'default' | 'stat' | 'list-item';
    padding?: 'sm' | 'md' | 'lg';
    children?: React.ReactNode;
}

const paddingMap = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

export const HrmCard = React.forwardRef<HTMLDivElement, HrmCardProps>(
    ({ variant = 'default', padding = 'md', className, children, ...props }, ref) => {
        const base = cn(
            variant === 'stat' && 'border border-border shadow-sm',
            variant === 'list-item' && 'border border-border/50 bg-muted/30',
        );

        return (
            <Card ref={ref} className={cn(base, className)} {...props}>
                <div className={cn(paddingMap[padding])}>{children}</div>
            </Card>
        );
    }
);
HrmCard.displayName = 'HrmCard';
