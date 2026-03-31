import React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    status: string | null | undefined;
    children?: React.ReactNode;
}

export const getStatusColorClasses = (status: string | null | undefined): string => {
    const s = status?.toString().toLowerCase() || '';

    // Green: Generated / Active / Approved / Completed / Paid / Verified / Published / Enabled / Success / Present / Company / Exceeds / Available
    if (
        ['generated', 'active', 'approved', 'completed', 'paid', 'verified', 'published', 'enabled', 'success', 'present', 'company', 'exceeds', 'available'].includes(s)
    ) {
        return 'bg-green-600 text-white hover:bg-green-700 border-transparent';
    }

    // Yellow: Pending / Draft / Below / Occupied
    if (
        ['pending', 'draft', 'in_progress', 'processing', 'review', 'on_hold', 'warning', 'late', 'half_day', 'on_leave', 'unpaid', 'scheduled', 'rescheduled', 'below', 'occupied'].includes(s)
    ) {
        return 'bg-yellow-400 text-yellow-950 hover:bg-yellow-500 border-transparent';
    }

    // Red: Rejected / Failed / Inactive / Needs Improvement / Maintenance
    if (
        ['rejected', 'failed', 'inactive', 'declined', 'cancelled', 'terminated', 'suspended', 'disabled', 'error', 'absent', 'unpaid_leave', 'resigned', 'expired', 'overdue', 'needs_improvement', 'maintenance'].includes(s)
    ) {
        return 'bg-red-600 text-white hover:bg-red-700 border-transparent';
    }

    // Blue: Employee / Primary / Self Review / Goal / Meets / Recurring / Company Wide
    if (['employee', 'primary', 'self_review', 'goal', 'meets', 'recurring', 'company_wide'].includes(s)) {
        return 'bg-blue-600 text-white hover:bg-blue-700 border-transparent';
    }

    // Gray (Default): Resigned / Expired / Overdue / Specific
    if (['resigned', 'specific'].includes(s)) {
        return 'bg-gray-500 text-white hover:bg-gray-600 border-transparent';
    }

    // Purple: Accountant / Special / KPI / OKR
    if (['accountant', 'special', 'kpi', 'okr'].includes(s)) {
        return 'bg-purple-600 text-white hover:bg-purple-700 border-transparent';
    }

    // Default Gray: Closed / ...
    return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200';
};

export function StatusBadge({ status, className, children, ...props }: StatusBadgeProps) {
    const colorClasses = getStatusColorClasses(status);

    // Format the status text if no children provided
    const displayText = children || (status ? status.toString().replace(/_/g, ' ') : 'Unknown');

    return (
        <Badge className={cn(colorClasses, 'whitespace-nowrap capitalize', className)} variant="outline" {...props}>
            {displayText}
        </Badge>
    );
}
