import { type FC, type ReactNode } from 'react';
import { cn } from '../utils/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4',
        'bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-600',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-slate-900 dark:text-white text-center">
        {title}
      </h3>
      {description && (
        <p className="text-slate-500 dark:text-slate-400 mt-1 mb-6 text-center max-w-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
};
