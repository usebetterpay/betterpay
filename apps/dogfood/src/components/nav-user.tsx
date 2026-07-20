'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClipboardCheck } from '@/components/animate-ui/icons/clipboard-check';
import { Heart } from '@/components/animate-ui/icons/heart';
import { LogOut } from '@/components/animate-ui/icons/log-out';
import { User } from '@/components/animate-ui/icons/user';
import { ShaderAvatar } from '@/components/shader-avatar';
import { Link } from 'react-router-dom';
import { useDogfood } from '@/lib/state';

const menuIcon = { size: 16, animateOnHover: true as const, className: 'shrink-0' };

export function NavUser() {
  const { state } = useDogfood();
  const email = state?.customerEmail ?? 'ayu@demo.corp';
  const name = state?.customerName ?? email.split('@')[0] ?? 'Demo';
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Account menu"
          >
            <ShaderAvatar size="md" monogram={initial} seed={2} />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem className="flex items-center justify-start gap-2">
          <DropdownMenuLabel className="flex items-center gap-3">
            <ShaderAvatar size="lg" monogram={initial} seed={2} />
            <div>
              <span className="font-medium text-foreground">{name}</span>
              <br />
              <div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground text-xs">
                {email}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/billing" />}>
            <ClipboardCheck {...menuIcon} />
            Plan & billing
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/payments" />}>
            <User {...menuIcon} />
            Payments
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<a href="https://betterpay.dev" target="_blank" rel="noreferrer" />}
          >
            <Heart {...menuIcon} />
            Help center
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="w-full cursor-default text-muted-foreground" disabled>
            <LogOut {...menuIcon} />
            Demo session
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
