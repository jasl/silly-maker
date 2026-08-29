// SPDX-License-Identifier: MIT
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";

import { useSillyOsOverlayHostV1 } from "./overlay-host.tsx";
import { cnV1 } from "./utils.ts";

interface AlertDialogContextValueV1 {
  readonly open: boolean;
  readonly titleId: string;
  readonly descriptionId: string;
  readonly triggerRef: { current: HTMLButtonElement | null };
  readonly setOpen: (open: boolean) => void;
}

const AlertDialogContextV1 = createContext<AlertDialogContextValueV1 | null>(null);

function useAlertDialogV1(): AlertDialogContextValueV1 {
  const context = useContext(AlertDialogContextV1);
  if (context === null) throw new TypeError("sillyos.alert_dialog.context_unavailable");
  return context;
}

export function AlertDialogV1({
  open = false,
  onOpenChange,
  children,
}: {
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children?: ReactNode;
}): ReactNode {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const setOpen = useCallback((next: boolean): void => {
    onOpenChange?.(next);
    if (next) return;
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [onOpenChange]);
  const context = useMemo<AlertDialogContextValueV1>(() => ({
    open,
    titleId,
    descriptionId,
    triggerRef,
    setOpen,
  }), [descriptionId, open, setOpen, titleId]);

  return (
    <AlertDialogContextV1.Provider value={context}>
      {children}
    </AlertDialogContextV1.Provider>
  );
}

function requireChildElementV1(children: ReactNode): ReactElement<ComponentProps<"button">> {
  if (!isValidElement(children)) throw new TypeError("sillyos.alert_dialog.child_unavailable");
  return children as ReactElement<ComponentProps<"button">>;
}

export function AlertDialogTriggerV1({
  asChild: _asChild,
  children,
}: {
  readonly asChild?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  const dialog = useAlertDialogV1();
  const child = requireChildElementV1(children);
  return cloneElement(child, {
    ref: dialog.triggerRef,
    "aria-haspopup": "dialog",
    "aria-expanded": dialog.open,
    onClick: (event) => {
      child.props.onClick?.(event);
      if (!event.defaultPrevented) dialog.setOpen(true);
    },
  });
}

export function AlertDialogCancelV1({
  asChild: _asChild,
  children,
}: {
  readonly asChild?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  const dialog = useAlertDialogV1();
  const child = requireChildElementV1(children);
  return cloneElement(child, {
    autoFocus: true,
    onClick: (event) => {
      child.props.onClick?.(event);
      if (!event.defaultPrevented) dialog.setOpen(false);
    },
  });
}

export function AlertDialogActionV1({
  asChild: _asChild,
  children,
}: {
  readonly asChild?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  const dialog = useAlertDialogV1();
  const child = requireChildElementV1(children);
  return cloneElement(child, {
    onClick: (event) => {
      child.props.onClick?.(event);
      if (!event.defaultPrevented) dialog.setOpen(false);
    },
  });
}

export function AlertDialogTitleV1(props: ComponentProps<"h2">): ReactNode {
  const { titleId } = useAlertDialogV1();
  return <h2 id={titleId} {...props} />;
}

export function AlertDialogDescriptionV1(props: ComponentProps<"p">): ReactNode {
  const { descriptionId } = useAlertDialogV1();
  return <p id={descriptionId} {...props} />;
}

export function AlertDialogContentV1({
  className,
  children,
  onEscapeKeyDown,
  ...props
}: Omit<ComponentProps<"dialog">, "open"> & {
  readonly onEscapeKeyDown?: (event: KeyboardEvent) => void;
}): ReactNode {
  const host = useSillyOsOverlayHostV1();
  const dialog = useAlertDialogV1();
  const contentRef = useRef<HTMLDialogElement | null>(null);
  const dispatchEscapeKeyDownV1 = useEffectEvent((event: KeyboardEvent): void => {
    onEscapeKeyDown?.(event);
  });

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!dialog.open || content === null) return undefined;
    if (typeof content.showModal === "function") {
      if (!content.open) content.showModal();
    } else {
      content.setAttribute("open", "");
    }
    return () => {
      if (typeof content.close === "function" && content.open) content.close();
      else content.removeAttribute("open");
    };
  }, [dialog.open]);

  useEffect(() => {
    if (!dialog.open) return undefined;
    const handleEscapeV1 = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      dispatchEscapeKeyDownV1(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      dialog.setOpen(false);
    };
    document.addEventListener("keydown", handleEscapeV1, true);
    return () => {
      document.removeEventListener("keydown", handleEscapeV1, true);
    };
  }, [dialog]);

  if (!dialog.open || host === null) return null;
  return createPortal(
    <dialog
      ref={contentRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={dialog.titleId}
      aria-describedby={dialog.descriptionId}
      data-slot="alert-dialog-content"
      className={cnV1(
        "sos:fixed sos:top-1/2 sos:left-1/2 sos:z-50 sos:m-0 sos:grid sos:w-[min(calc(100%-2rem),30rem)] sos:[translate:-50%_-50%] sos:gap-4 sos:rounded-card sos:[border:1px_solid_var(--sos-line)] sos:bg-popover sos:p-6 sos:text-popover-foreground sos:[box-shadow:var(--sos-shadow-dialog)] sos:outline-none",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        const keyboardEvent = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
        onEscapeKeyDown?.(keyboardEvent);
        if (!keyboardEvent.defaultPrevented) dialog.setOpen(false);
      }}
      {...props}
    >
      {children}
    </dialog>,
    host,
  );
}
