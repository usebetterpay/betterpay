import { cn } from "@/lib/utils";

export function InsetScrollEdgeFade({
	edge,
	className,
	...props
}: React.ComponentProps<"div"> & {
	edge: "top" | "bottom";
}) {
	return (
		<div
			aria-hidden
			className={cn(
				"pointer-events-none absolute inset-x-2 z-1 h-4 rounded-[inherit] bg-background",
				edge === "top" ? "mask-b-from-10% top-0" : "mask-t-from-10% bottom-0",
				className
			)}
			{...props}
		/>
	);
}
