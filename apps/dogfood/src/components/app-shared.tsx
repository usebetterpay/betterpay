import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { ClipboardCheck } from '@/components/animate-ui/icons/clipboard-check';
import { ClipboardList } from '@/components/animate-ui/icons/clipboard-list';
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard';
import { Layers } from '@/components/animate-ui/icons/layers';
import { MessageCircleQuestion } from '@/components/animate-ui/icons/message-circle-question';
import { Settings } from '@/components/animate-ui/icons/settings';
import { Sparkles } from '@/components/animate-ui/icons/sparkles';
import { SidebarMenuButton } from '@/components/ui/sidebar';

/** Shared size for sidebar nav glyphs (Animate UI defaults to 28).
 *  Hover animation is driven by parent <AnimateIcon> on the menu row. */
const navIconProps = {
  size: 16,
  className: 'shrink-0',
};

export type SidebarNavItem = {
  title: string;
  path?: string;
  icon?: ReactNode;
  end?: boolean;
};

export type SidebarNavGroup = {
  label?: string;
  items: SidebarNavItem[];
};

export function CustomMenuButton({
  className,
  ...props
}: React.ComponentProps<typeof SidebarMenuButton>) {
  return (
    <SidebarMenuButton
      className={cn(
        'bp-nav-item h-9',
        // Idle — icon + label one muted tone
        'text-[var(--text-secondary)]',
        '[&_svg]:text-current',
        '[&>span:last-child]:text-clip [&>span]:text-nowrap [&>span]:font-medium [&>span]:tracking-normal [&>span]:text-current',
        '[&>span]:transition-opacity [&>span]:duration-[calc(var(--sidebar-animation-duration)*0.5)] [&>span]:ease-(--sidebar-animation-ease) [&>span]:group-data-[collapsible=icon]:opacity-0',
        '[&>span]:delay-[calc(var(--sidebar-animation-duration)*0.25)] [&>span]:group-data-[collapsible=icon]:delay-0',
        // Hover — quiet lift only
        'hover:bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] hover:text-foreground',
        // Active — soft fill + dark type (no bar / ring / white card)
        'data-active:bg-[color-mix(in_srgb,var(--primary)_11%,var(--card))] data-active:font-medium data-active:text-foreground',
        'data-active:shadow-none data-active:ring-0',
        'data-active:[&_svg]:text-foreground data-active:[&>span]:text-foreground',
        'data-active:hover:bg-[color-mix(in_srgb,var(--primary)_14%,var(--card))] data-active:hover:text-foreground',
        'duration-(--sidebar-animation-duration) ease-(--sidebar-animation-ease)',
        className,
      )}
      {...props}
    />
  );
}

/** DEMO CORP dogfood primary nav. */
export const navGroups: SidebarNavGroup[] = [
  {
    label: 'Billing',
    items: [
      {
        title: 'Overview',
        path: '/',
        end: true,
        icon: <LayoutDashboard {...navIconProps} />,
      },
      {
        title: 'Plans',
        path: '/plans',
        icon: <Sparkles {...navIconProps} />,
      },
      {
        title: 'Credits',
        path: '/credits',
        icon: <Layers {...navIconProps} />,
      },
      {
        title: 'Billing',
        path: '/billing',
        icon: <ClipboardCheck {...navIconProps} />,
      },
      {
        title: 'Payments',
        path: '/payments',
        icon: <ClipboardList {...navIconProps} />,
      },
    ],
  },
];

export const footerNavLinks: SidebarNavItem[] = [
  {
    title: 'Support',
    path: 'https://betterpay.dev',
    icon: <MessageCircleQuestion {...navIconProps} size={14} />,
  },
  {
    title: 'Docs',
    path: 'https://betterpay.dev',
    icon: <Settings {...navIconProps} size={14} />,
  },
];

export const navLinks: SidebarNavItem[] = [
  ...navGroups.flatMap((group) => group.items),
  ...footerNavLinks,
];

export function pathIsActive(pathname: string, path?: string, end?: boolean) {
  if (!path || path.startsWith('http')) return false;
  if (end || path === '/') return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}
