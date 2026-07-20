import { cn } from '@/lib/utils';
import { CustomSidebarTrigger } from '@/components/custom-sidebar-trigger';

export function AppSidebarFooter() {
  return (
    <div className={cn('flex items-center justify-between', 'ps-3 pt-4 pb-2')}>
      <p
        className={cn(
          'text-nowrap text-[9px] text-muted-foreground',
          'transition-opacity group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:opacity-0',
          'duration-[calc(var(--sidebar-animation-duration)*0.6)] ease-(--sidebar-animation-ease)',
        )}
      >
        © BetterPay dogfood
      </p>
      <CustomSidebarTrigger />
    </div>
  );
}
