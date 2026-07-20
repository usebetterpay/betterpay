'use client';

import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LogoIcon } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NavUser } from '@/components/nav-user';
import { NotificationsPopover } from '@/components/notifications-popover';
import { Projects, type ProjectType } from '@/components/projects';
import { useDogfood } from '@/lib/state';
import { Badge } from '@betterpay/ui';

export function AppHeader() {
  const { state } = useDogfood();

  const projects: ProjectType[] = [
    {
      id: '1',
      name: 'DEMO CORP',
      slug: 'demo-corp',
      logo: null,
      plan: state?.plan.name ?? 'Free',
    },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-(--app-header-height) w-full shrink-0 items-center justify-between gap-2 px-4 md:pe-6',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Button
          className="hidden h-9 md:flex"
          variant="ghost"
          render={<Link to="/" />}
          nativeButton={false}
        >
          <LogoIcon className="h-5 w-5" alt="DEMO CORP" />
        </Button>
        <SidebarTrigger className="md:hidden" />
        <Separator
          className="h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <Projects activeProjectId="1" projects={projects} />
        {state ? (
          <div className="ms-1 hidden items-center gap-1.5 sm:flex">
            <Badge variant="muted">{state.plan.name}</Badge>
            <Badge variant="outline">{state.paymentMode}</Badge>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <NotificationsPopover />
        <Separator
          className="h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <NavUser />
      </div>
    </header>
  );
}
