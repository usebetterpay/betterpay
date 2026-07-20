"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ShaderAvatar } from "@/components/shader-avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check } from "@/components/animate-ui/icons/check";
import { ChevronUpDown } from "@/components/animate-ui/icons/chevron-up-down";
import { Plus } from "@/components/animate-ui/icons/plus";

/** Organization row for the workspace switcher (registry / demo data). */
export type ProjectType = {
	id: string;
	name: string;
	slug: string;
	/** Unused — org mark is ShaderAvatar. Kept for API compatibility. */
	logo: string | null;
	/** Shown under the org name, e.g. "Free", "Pro". */
	plan?: string;
};

interface Props {
	activeProjectId: string;
	projects: ProjectType[];
}

export function Projects({ activeProjectId, projects }: Props) {
	const isMobile = useIsMobile();

	const activeProject =
		projects.find((project) => project.id === activeProjectId) || projects[0];

	if (!activeProject) {
		return null;
	}

	return (
		<div className="flex items-center gap-2 px-1">
			<a
				className="flex max-w-36 items-center gap-2 text-muted-foreground hover:text-foreground"
				href="#"
			>
				<ShaderAvatar size="xs" monogram={activeProject.name.charAt(0)} seed={1} />
				<span className="truncate font-medium text-xs md:text-sm">
					{activeProject.name}
				</span>
			</a>
			<DropdownMenu>
				<DropdownMenuTrigger render={<Button size="icon-xs" variant="ghost" />}>
					<ChevronUpDown
						aria-hidden="true"
						size={14}
						animateOnHover
						className="shrink-0 text-muted-foreground"
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align={isMobile ? "center" : "start"}
					className="min-w-56 p-1 md:min-w-64"
					sideOffset={4}
				>
					<ProjectsList currentId={activeProjectId} projects={projects} />
					<DropdownMenuSeparator />
					<DropdownMenuItem className="cursor-pointer text-muted-foreground">
						<Plus size={16} animateOnHover className="shrink-0" />
						Create new <span className="hidden md:inline">project</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function ProjectsList({
	projects,
	currentId,
}: {
	projects: ProjectType[];
	currentId: string;
}) {
	return (
		<>
			<DropdownMenuLabel className="uppercase">Projects</DropdownMenuLabel>
			<div className="max-h-92 overflow-y-auto">
				<DropdownMenuGroup>
					{projects.map((project) => {
						const planLabel = project.plan ?? "Free";
						const isCurrent = currentId === project.id;

						return (
							<DropdownMenuItem
								className={cn(
									"relative flex w-full items-center gap-x-2 px-2 py-1.5",
									isCurrent &&
										"bg-sidebar-accent text-sidebar-accent-foreground"
								)}
								key={project.id}
							>
								<ShaderAvatar
									size="sm"
									monogram={project.name.charAt(0)}
									seed={1}
									className="size-7"
								/>
								<div className="flex min-w-0 flex-1 flex-col items-start justify-center">
									<div className="grid w-full flex-1 text-left text-sm leading-tight">
										<span className="truncate">{project.name}</span>
									</div>
									<span className="text-xs opacity-60">{planLabel}</span>
								</div>
								{isCurrent && (
									<Check
										aria-hidden="true"
										size={16}
										className="ml-auto shrink-0"
									/>
								)}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
			</div>
		</>
	);
}
