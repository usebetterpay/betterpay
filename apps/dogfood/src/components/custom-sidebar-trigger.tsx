import { cn } from "@/lib/utils";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function CustomSidebarTrigger() {
	return (
		<Tooltip>
			<TooltipTrigger
				className={cn(
					"size-8! text-muted-foreground transition-[margin]",
					"group-hover:opacity-100",
					"group-data-[collapsible=icon]:-ml-(--sidebar-width)"
				)}
				delay={1000}
				render={<SidebarTrigger />}
			/>
			<TooltipContent align="center" className="px-2 py-1" side="right">
				Toggle Sidebar{" "}
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<Kbd>b</Kbd>
				</KbdGroup>
			</TooltipContent>
		</Tooltip>
	);
}
