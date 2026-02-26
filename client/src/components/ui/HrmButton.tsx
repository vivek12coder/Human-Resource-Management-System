import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button, buttonVariants } from './button';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link' | 'default';
type ButtonSize = 'sm' | 'md' | 'lg';

interface HrmButtonProps extends Omit<React.ComponentProps<'button'>, 'size'> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    asChild?: boolean;
}

const variantMap: Record<ButtonVariant, VariantProps<typeof buttonVariants>['variant']> = {
    primary: 'default',
    secondary: 'secondary',
    outline: 'outline',
    ghost: 'ghost',
    danger: 'destructive',
    link: 'link',
    default: 'default',
};
const sizeMap: Record<ButtonSize, VariantProps<typeof buttonVariants>['size']> = {
    sm: 'sm',
    md: 'default',
    lg: 'lg',
};

export const HrmButton = React.forwardRef<HTMLButtonElement, HrmButtonProps>(
    ({ variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, className, ...props }, ref) => {
        return (
            <Button
                ref={ref}
                variant={variantMap[variant] ?? 'default'}
                size={sizeMap[size] ?? 'default'}
                disabled={disabled || isLoading}
                className={cn('gap-2', className)}
                {...props}
            >
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : leftIcon}
                {children}
                {!isLoading && rightIcon}
            </Button>
        );
    }
);
HrmButton.displayName = 'HrmButton';
