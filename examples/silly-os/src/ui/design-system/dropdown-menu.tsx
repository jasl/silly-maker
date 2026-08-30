// SPDX-License-Identifier: MIT
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronRight, Circle } from "lucide-react";
import { type ComponentProps, type ReactNode } from "react";

import { useSillyOsOverlayHostV1 } from "./overlay-host.tsx";
import { cnV1 } from "./utils.ts";

/** Product menus never lock or inert the page and therefore avoid Radix's
 * dynamic scroll-lock style injection under the strict control-plane CSP. */
export function DropdownMenuV1(
  props: Omit<ComponentProps<typeof DropdownMenuPrimitive.Root>, "modal">,
): ReactNode {
  return <DropdownMenuPrimitive.Root {...props} modal={false} />;
}
export const DropdownMenuTriggerV1 = DropdownMenuPrimitive.Trigger;
export const DropdownMenuSubV1 = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroupV1 = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuContentV1({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>): ReactNode {
  const host = useSillyOsOverlayHostV1();
  if (host === null) return null;
  return (
    <DropdownMenuPrimitive.Portal container={host}>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cnV1(
          "sos:z-50 sos:min-w-56 sos:overflow-hidden sos:rounded-card sos:[border:1px_solid_var(--sos-line)] sos:bg-popover sos:p-1.5 sos:text-popover-foreground sos:[box-shadow:var(--sos-shadow-overlay)] sos:outline-none",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItemV1({
  className,
  inset,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & { readonly inset?: boolean }): ReactNode {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset || undefined}
      className={cnV1(
        "sos:relative sos:flex sos:min-h-control sos:cursor-default sos:select-none sos:items-center sos:gap-2 sos:rounded-control sos:px-2.5 sos:py-2 sos:text-sm sos:outline-none",
        "sos:focus:bg-accent-soft sos:focus:text-foreground sos:data-[disabled]:pointer-events-none sos:data-[disabled]:opacity-45 sos:data-[inset]:pl-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSubTriggerV1({
  className,
  inset,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  readonly inset?: boolean;
}): ReactNode {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset || undefined}
      className={cnV1(
        "sos:flex sos:min-h-control sos:cursor-default sos:select-none sos:items-center sos:gap-2 sos:rounded-control sos:px-2.5 sos:py-2 sos:text-sm sos:outline-none",
        "sos:focus:bg-accent-soft sos:data-[state=open]:bg-accent-soft sos:data-[inset]:pl-8",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight
        className="sos:ml-auto sos:size-4 sos:text-muted-foreground"
        aria-hidden="true"
      />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContentV1({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.SubContent>): ReactNode {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cnV1(
        "sos:z-50 sos:min-w-48 sos:overflow-hidden sos:rounded-card sos:[border:1px_solid_var(--sos-line)] sos:bg-popover sos:p-1.5 sos:text-popover-foreground sos:[box-shadow:var(--sos-shadow-overlay)] sos:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuRadioItemV1({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>): ReactNode {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cnV1(
        "sos:relative sos:flex sos:min-h-control sos:cursor-default sos:select-none sos:items-center sos:gap-2 sos:rounded-control sos:py-2 sos:pr-2.5 sos:pl-8 sos:text-sm sos:outline-none",
        "sos:focus:bg-accent-soft sos:data-[disabled]:pointer-events-none sos:data-[disabled]:opacity-45",
        className,
      )}
      {...props}
    >
      <span className="sos:absolute sos:left-2.5 sos:flex sos:size-4 sos:items-center sos:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="sos:size-2 sos:fill-current" aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function DropdownMenuLabelV1({
  className,
  inset,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label> & { readonly inset?: boolean }): ReactNode {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset || undefined}
      className={cnV1(
        "sos:px-2.5 sos:py-1.5 sos:text-xs sos:[font-weight:600] sos:text-muted-foreground sos:data-[inset]:pl-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparatorV1({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>): ReactNode {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cnV1("sos:-mx-0.5 sos:my-1 sos:h-px sos:bg-border", className)}
      {...props}
    />
  );
}
