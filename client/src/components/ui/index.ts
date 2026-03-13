// ─── HRM wrapper components (match old API used by pages) ─
// Pages import: Button, Card, Badge, Input, Select, Table, Modal
export { HrmButton as Button } from './HrmButton';
export { HrmBadge as Badge } from './HrmBadge';
export { HrmCard as Card } from './HrmCard';
export { HrmInput as Input } from './HrmInput';
export { HrmSelect as Select } from './HrmSelect';
export { HrmTable as Table } from './HrmTable';
export { HrmModal as Modal } from './HrmModal';
export { ErrorBoundary } from './ErrorBoundary';

// ─── shadcn/ui primitives (prefixed for direct use) ───────
export { buttonVariants } from './button';
export { badgeVariants } from './badge';
export { CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Input as ShadInput } from './input';
export { SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export {
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from './table';
export {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './dialog';
export { Avatar, AvatarFallback, AvatarImage } from './avatar';
export { Separator } from './separator';
export { Skeleton } from './skeleton';
export {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './dropdown-menu';
