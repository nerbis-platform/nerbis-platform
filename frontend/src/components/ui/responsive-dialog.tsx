"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const MOBILE_BREAKPOINT = "(max-width: 767px)"

interface ResponsiveDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function ResponsiveDialog({ children, ...props }: ResponsiveDialogProps) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  if (isMobile) {
    return <Sheet {...props}>{children}</Sheet>
  }
  return <Dialog {...props}>{children}</Dialog>
}

function ResponsiveDialogTrigger({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  if (isMobile) {
    return <SheetTrigger className={className} {...props} />
  }
  return <DialogTrigger className={className} {...props} />
}

function ResponsiveDialogClose({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  if (isMobile) {
    return <SheetClose className={className} {...props} />
  }
  return <DialogClose className={className} {...props} />
}

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className={cn("max-h-[85dvh] overflow-y-auto rounded-t-xl", className)}
        {...(props as React.ComponentProps<typeof SheetContent>)}
      >
        {children}
      </SheetContent>
    )
  }
  return (
    <DialogContent
      className={className}
      {...(props as React.ComponentProps<typeof DialogContent>)}
    >
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  if (isMobile) {
    return <SheetHeader className={className} {...props} />
  }
  return <DialogHeader className={className} {...props} />
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  if (isMobile) {
    return <SheetFooter className={className} {...props} />
  }
  return <DialogFooter className={className} {...props} />
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  if (isMobile) {
    return (
      <SheetTitle
        className={className}
        {...(props as React.ComponentProps<typeof SheetTitle>)}
      />
    )
  }
  return (
    <DialogTitle
      className={className}
      {...(props as React.ComponentProps<typeof DialogTitle>)}
    />
  )
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  if (isMobile) {
    return (
      <SheetDescription
        className={className}
        {...(props as React.ComponentProps<typeof SheetDescription>)}
      />
    )
  }
  return (
    <DialogDescription
      className={className}
      {...(props as React.ComponentProps<typeof DialogDescription>)}
    />
  )
}

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
}
