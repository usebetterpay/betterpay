import { NavLink, useLocation } from 'react-router-dom';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  CustomMenuButton,
  pathIsActive,
  type SidebarNavGroup,
} from '@/components/app-shared';

export function NavGroup({ label, items }: SidebarNavGroup) {
  const { pathname } = useLocation();

  return (
    <SidebarGroup>
      {label ? (
        <SidebarGroupLabel className="duration-[calc(var(--sidebar-animation-duration)*0.8)] ease-(--sidebar-animation-ease)">
          {label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarMenu>
        {items.map((item) => {
          const active = pathIsActive(pathname, item.path, item.end);
          return (
            <SidebarMenuItem key={item.title}>
              {/* Hover anywhere on the row triggers Animate UI icon motion */}
              <AnimateIcon animateOnHover asChild>
                <CustomMenuButton
                  isActive={active}
                  tooltip={item.title}
                  render={<NavLink to={item.path ?? '/'} end={item.end} />}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </CustomMenuButton>
              </AnimateIcon>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
