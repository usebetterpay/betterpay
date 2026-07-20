'use client';

import { cn } from '@/lib/utils';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { LogoIcon } from '@/components/logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { AppSearch } from '@/components/app-search';
import { CustomMenuButton, footerNavLinks } from '@/components/app-shared';
import { AppSidebarFooter } from '@/components/app-sidebar-footer';
import { NavGroup } from '@/components/nav-group';
import { navGroups } from '@/components/app-shared';

export function AppSidebar() {
  return (
    <Sidebar
      className={cn(
        '**:data-[slot=sidebar-inner]:bg-transparent',
        'top-(--app-header-height) h-[calc(100%-var(--app-header-height))]',
        'duration-(--sidebar-animation-duration) ease-(--sidebar-animation-ease)',
        'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]',
      )}
      collapsible="icon"
      variant="inset"
    >
      <SidebarHeader>
        <div className="flex h-(--app-header-height,3.5rem) items-center gap-2 px-4 md:hidden">
          <LogoIcon className="h-5 w-5" />
          <span className="font-semibold text-sm tracking-tight">DEMO CORP</span>
        </div>
        <AppSearch />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group, index) => (
          <NavGroup key={`sidebar-group-${index}`} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {footerNavLinks.map((item) => (
            <SidebarMenuItem key={item.title}>
              <AnimateIcon animateOnHover asChild>
                <CustomMenuButton
                  className="h-7 [&>span]:text-xs [&_svg]:size-3.5"
                  render={
                    <a href={item.path} target="_blank" rel="noreferrer" />
                  }
                >
                  {item.icon}
                  <span>{item.title}</span>
                </CustomMenuButton>
              </AnimateIcon>
            </SidebarMenuItem>
          ))}
          <AppSidebarFooter />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
