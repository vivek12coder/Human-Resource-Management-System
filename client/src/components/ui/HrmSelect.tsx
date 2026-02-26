import React from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
    value: string;
    label: string;
}

interface HrmSelectProps extends Omit<React.ComponentProps<'select'>, 'children'> {
    label?: string;
    error?: string;
    options: SelectOption[];
    placeholder?: string;
}

export const HrmSelect = React.forwardRef<HTMLSelectElement, HrmSelectProps>(
    ({ label, error, options, placeholder, className, id, ...props }, ref) => {
        const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label htmlFor={selectId} className="text-sm font-medium text-foreground">
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={selectId}
                    className={cn(
                        'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-destructive focus:ring-destructive/20',
                        className
                    )}
                    {...props}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        );
    }
);
HrmSelect.displayName = 'HrmSelect';
