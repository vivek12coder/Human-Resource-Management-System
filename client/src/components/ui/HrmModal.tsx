import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './dialog';
import { cn } from '@/lib/utils';

interface HrmModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children: React.ReactNode;
}

const sizeClasses: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

export const HrmModal = ({ isOpen, onClose, title, description, size = 'md', children }: HrmModalProps) => (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className={cn(sizeClasses[size], 'bg-card text-card-foreground border-border max-h-[85vh] overflow-y-auto')}>
            {title && (
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {/* Suppress the Radix aria-describedby warning by always including DialogDescription */}
                    <DialogDescription className={description ? '' : 'sr-only'}>
                        {description ?? title}
                    </DialogDescription>
                </DialogHeader>
            )}
            <div>{children}</div>
        </DialogContent>
    </Dialog>
);
