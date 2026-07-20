"use client";

import { cn } from "@/lib/utils";
import type React from "react";
import { useState } from "react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Bell } from "@/components/animate-ui/icons/bell";
import { CircleCheck } from "@/components/animate-ui/icons/circle-check";
import { CircleX } from "@/components/animate-ui/icons/circle-x";
import { MessageCircle } from "@/components/animate-ui/icons/message-circle";
import { MessageCircleWarning } from "@/components/animate-ui/icons/message-circle-warning";

type NotificationVariant = "info" | "success" | "warning" | "error";

type Notification = {
	id: number;
	variant: NotificationVariant;
	source: string;
	summary: string;
	timestamp: string;
	unread: boolean;
};

const notificationsData: Notification[] = [
	{
		id: 1,
		variant: "warning",
		source: "Workspace usage",
		summary:
			"You have used 88% of included seats this billing period. Add seats or archive inactive members.",
		timestamp: "41 min ago",
		unread: true,
	},
	{
		id: 2,
		variant: "success",
		source: "Billing",
		summary:
			"Invoice #1842 was paid. Your subscription renews on April 12 with the same card on file.",
		timestamp: "1 hr ago",
		unread: true,
	},
	{
		id: 34,
		variant: "info",
		source: "Access review",
		summary:
			"Quarterly access review is due Friday. Two projects still need an owner sign-off.",
		timestamp: "3 hr ago",
		unread: false,
	},
	{
		id: 4,
		variant: "success",
		source: "Security",
		summary:
			"SSO certificate was renewed for efferd.com. No downtime was required.",
		timestamp: "Yesterday",
		unread: false,
	},
	{
		id: 5,
		variant: "info",
		source: "Team",
		summary:
			"Mara Okonkwo accepted your invite and now has Editor access to the Design workspace.",
		timestamp: "Yesterday",
		unread: false,
	},
	{
		id: 6,
		variant: "error",
		source: "API keys",
		summary:
			"The key ending in ···7f2a expires in 48 hours. Rotate it from Settings → API before it stops working.",
		timestamp: "2 days ago",
		unread: false,
	},
	{
		id: 7,
		variant: "info",
		source: "Integrations",
		summary:
			"GitHub sync finished for 9 repositories. Two branches were skipped because of protected rules.",
		timestamp: "4 days ago",
		unread: false,
	},
];

export function NotificationsPopover() {
	const [notifications, setNotifications] = useState(notificationsData);
	const unreadCount = notifications.filter((n) => n.unread).length;

	const handleNotificationClick = (id: number) => {
		setNotifications(
			notifications.map((notification) =>
				notification.id === id
					? { ...notification, unread: false }
					: notification
			)
		);
	};

	return (
		<Popover>
			<PopoverTrigger render={<Button aria-label={
            						unreadCount > 0
            							? `Open notifications, ${unreadCount} unread`
            							: "Open notifications"
            					} className="relative size-8" variant="outline" />}>
					<Bell size={16} animateOnHover className="shrink-0" />
					{unreadCount > 0 && (
            						<span
            							aria-hidden
            							className={cn(
            								"absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-medium text-[10px] text-primary-foreground",
            								unreadCount > 9 && "px-1.5"
            							)}
            						>
            							{unreadCount > 9 ? "9+" : unreadCount}
            						</span>
            					)}</PopoverTrigger>
			<PopoverContent
				align="end"
				className="relative w-[min(calc(100vw-1.5rem),22rem)] gap-0 overflow-hidden p-0 sm:w-96"
				side="bottom"
			>
				<div className="flex h-12 items-center justify-between gap-3 px-4">
					<div className="min-w-0 space-y-0.5">
						<h2 className="font-medium text-foreground text-sm">
							Notifications
						</h2>
					</div>
				</div>
				<div
					className={cn(
						"relative max-h-[min(24rem,70dvh)] rounded-t-lg bg-background",
						"bg-clip-border before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_-1px_--theme(--color-foreground/8%)]"
					)}
				>
					<div className="flex max-h-[min(24rem,70dvh)] flex-col overflow-y-auto p-2">
						{notifications.length > 0 ? (
							notifications.map((notification) => (
								<NotificationItem
									key={notification.id}
									notification={notification}
									onClick={() => handleNotificationClick(notification.id)}
								/>
							))
						) : (
							<Empty className="min-h-48 border-0 py-8 md:py-10">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Bell size={20} className="shrink-0" />
									</EmptyMedia>
									<EmptyTitle>Nothing here yet</EmptyTitle>
									<EmptyDescription className="text-pretty">
										When something needs your attention, it will show up in this
										inbox.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function NotificationItem({
	notification,
	className,
	...props
}: React.ComponentProps<"button"> & { notification: Notification }) {
	return (
		<button
			className={cn(
				"rounded-lg text-start outline-none",
				"flex w-full gap-3 p-3",
				"hover:bg-muted/80 dark:hover:bg-muted/40",
				"focus-visible:ring-2 focus-visible:ring-ring/20",
				notification.unread
					? "mb-1 border border-border/80 bg-card shadow-xs"
					: "border border-transparent",
				className
			)}
			data-state={notification.unread ? "unread" : "read"}
			type="button"
			{...props}
		>
			<NotificationItemIcon variant={notification.variant} />
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex items-start justify-between gap-2">
					<p className="font-medium text-foreground text-xs leading-tight">
						{notification.source}
					</p>
					<span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
						{notification.timestamp}
					</span>
				</div>
				<p className="text-pretty text-muted-foreground text-xs leading-snug">
					{notification.summary}
				</p>
			</div>
			{notification.unread && (
				<span
					aria-hidden
					className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
				/>
			)}
		</button>
	);
}

function NotificationItemIcon({ variant }: { variant: NotificationVariant }) {
	const styles = {
		error: {
			well: "bg-destructive/10 text-destructive",
			color: "text-destructive",
		},
		success: {
			well: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
			color: "text-emerald-600 dark:text-emerald-400",
		},
		warning: {
			well: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
			color: "text-yellow-600 dark:text-yellow-400",
		},
		info: {
			well: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
			color: "text-blue-600 dark:text-blue-400",
		},
	} as const;

	const s = styles[variant];

	switch (variant) {
		case "success":
			return (
				<span
					className={cn(
						"rounded-lg flex size-9 shrink-0 items-center justify-center",
						s.well
					)}
				>
					<CircleCheck size={16} className={cn("shrink-0", s.color)} />
				</span>
			);
		case "info":
			return (
				<span
					className={cn(
						"rounded-lg flex size-9 shrink-0 items-center justify-center",
						s.well
					)}
				>
					<MessageCircle size={16} className={cn("shrink-0", s.color)} />
				</span>
			);
		case "warning":
			return (
				<span
					className={cn(
						"rounded-lg flex size-9 shrink-0 items-center justify-center",
						s.well
					)}
				>
					<MessageCircleWarning size={16} className={cn("shrink-0", s.color)} />
				</span>
			);
		case "error":
			return (
				<span
					className={cn(
						"rounded-lg flex size-9 shrink-0 items-center justify-center",
						s.well
					)}
				>
					<CircleX size={16} className={cn("shrink-0", s.color)} />
				</span>
			);
		default: {
			const _exhaustive: never = variant;
			return _exhaustive;
		}
	}
}
