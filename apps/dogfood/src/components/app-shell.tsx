import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { InsetScrollEdgeFade } from "@/components/inset-scroll-edge-fade";

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider
			className={cn(
				"[--app-header-height:3.5rem]",
				"[--sidebar-animation-ease:ease-[cubic-bezier(0.32,0.72,0,1)]]",
				"[--sidebar-animation-duration:250ms]",
				"[--sidebar-inset-radius:2.5rem]",
				"relative flex h-svh w-full flex-col overflow-hidden has-data-[variant=inset]:bg-sidebar/80",
				"**:data-[slot=sidebar-gap]:duration-(--sidebar-animation-duration) **:data-[slot=sidebar-gap]:ease-(--sidebar-animation-ease)"
			)}
		>
			<AppHeader />
			<div className="relative flex h-full min-h-0 flex-1">
				<AppSidebar />
				<SidebarInset
					className={cn(
						"overflow-visible! relative min-h-0 rounded-t-xl md:rounded-xl",
						"ring-[0.5px] ring-sidebar-border",
						"md:peer-data-[variant=inset]:ms-0 md:peer-data-[variant=inset]:mt-0",
						"bg-clip-border before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-1px)] before:shadow-[0_-1px_--theme(--color-foreground/8%)]"
					)}
				>
					<div className="overflow-y-auto overflow-x-hidden p-4 md:p-6">
						{children}
					</div>
					<InsetScrollEdgeFade edge="top" />
					<InsetScrollEdgeFade edge="bottom" />
				</SidebarInset>
			</div>
		</SidebarProvider>
	);
}
