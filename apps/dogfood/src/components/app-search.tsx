"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef } from "react";
import { useKeypress } from "@/hooks/use-keypress";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useSidebar } from "@/components/ui/sidebar";
import { Search } from "@/components/animate-ui/icons/search";

export function AppSearch() {
	const { setOpen } = useSidebar();

	const groupRef = useRef<HTMLDivElement>(null);

	const focusInput = useCallback(() => {
		const input = groupRef.current?.querySelector<HTMLInputElement>(
			"[data-slot=input-group-control]"
		);
		input?.focus({ preventScroll: true });
		setOpen(true);
	}, [setOpen]);

	useKeypress({
		combo: ["meta+k", "ctrl+k"],
		callback: focusInput,
	});

	return (
		<InputGroup
			className={cn(
				"w-full",
				"group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:pl-0",
				"transition-[height,width] duration-(--sidebar-animation-duration) ease-(--sidebar-animation-ease)"
			)}
			onClick={() => setOpen(true)}
			ref={groupRef}
		>
			<InputGroupAddon align="inline-start" className="pl-1.75">
				<Search size={16} animateOnHover className="shrink-0" />
			</InputGroupAddon>
			<InputGroupInput
				aria-keyshortcuts="Meta+K Control+K"
				aria-label="Search products"
				className={cn(
					"transition-opacity duration-[calc(var(--sidebar-animation-duration)*0.8)] ease-(--sidebar-animation-ease)",
					"group-data-[collapsible=icon]:opacity-0",
					"placeholder:text-nowrap"
				)}
				name="q"
				placeholder="Search..."
				type="search"
			/>
			<InputGroupAddon
				align="inline-end"
				className={cn(
					"hidden gap-0.5 md:flex",
					"transition-opacity duration-[calc(var(--sidebar-animation-duration)*0.8)] ease-(--sidebar-animation-ease)",
					"group-data-[collapsible=icon]:opacity-0"
				)}
			>
				<KbdGroup>
					<Kbd>⌘</Kbd>
					<Kbd>K</Kbd>
				</KbdGroup>
			</InputGroupAddon>
		</InputGroup>
	);
}
