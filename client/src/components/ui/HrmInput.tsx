import React from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface HrmInputProps extends React.ComponentProps<'input'> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    hint?: string;
}

export const HrmInput = React.forwardRef<HTMLInputElement, HrmInputProps>(
    ({ label, error, leftIcon, rightIcon, hint, className, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-sm font-medium text-foreground"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
                            {leftIcon}
                        </div>
                    )}
                    <Input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            leftIcon && 'pl-10',
                            rightIcon && 'pr-10',
                            error && 'border-destructive focus-visible:ring-destructive/20',
                            className
                        )}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
        );
    }
);
HrmInput.displayName = 'HrmInput';
