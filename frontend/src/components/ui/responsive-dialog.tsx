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

const ResponsiveDialogContext = React.createContext<boolean>(false)

function useResponsiveDialog() {
  return React.useContext(ResponsiveDialogContext)
}

type ResponsiveDialogProps = React.ComponentProps<typeof Dialog>

type ResponsiveDialogContentProps =
  React.ComponentProps<typeof DialogContent> &
  Omit<React.ComponentProps<typeof SheetContent>, "side">

function ResponsiveDialog({ children, ...props }: ResponsiveDialogProps) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)

  const Wrapper = isMobile ? Sheet : Dialog
  return (
    <ResponsiveDialogContext.Provider value={isMobile}>
      <Wrapper {...props}>{children}</Wrapper>
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = useResponsiveDialog()

  if (isMobile) {
    return <SheetTrigger className={className} {...props} />
  }
  return <DialogTrigger className={className} {...props} />
}

function ResponsiveDialogClose({
  className,
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const isMobile = useResponsiveDialog()

  if (isMobile) {
    return <SheetClose className={className} {...props} />
  }
  return <DialogClose className={className} {...props} />
}

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: ResponsiveDialogContentProps) {
  const isMobile = useResponsiveDialog()

  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className={cn("max-h-[85dvh] overflow-y-auto rounded-t-xl", className)}
        {...props}
      >
        {children}
      </SheetContent>
    )
  }
  return (
    <DialogContent
      className={className}
      {...props}
    >
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  const isMobile = useResponsiveDialog()

  if (isMobile) {
    return <SheetHeader className={className} {...props} />
  }
  return <DialogHeader className={className} {...props} />
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const isMobile = useResponsiveDialog()

  if (isMobile) {
    return <SheetFooter className={className} {...props} />
  }
  return <DialogFooter className={className} {...props} />
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useResponsiveDialog()

  if (isMobile) {
    return <SheetTitle className={className} {...props} />
  }
  return <DialogTitle className={className} {...props} />
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useResponsiveDialog()

  if (isMobile) {
    return <SheetDescription className={className} {...props} />
  }
  return <DialogDescription className={className} {...props} />
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
