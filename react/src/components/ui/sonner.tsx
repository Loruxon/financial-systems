import { useTheme } from "@/components/theme-provider"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      gap={6}
      visibleToasts={4}
      offset={16}
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500" />,
        info:    <InfoIcon className="size-4 text-primary" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
        error:   <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:       "!bg-card !text-card-foreground !border !border-border !rounded-xl !shadow-lg !shadow-black/8 !pl-4 !border-l-[3px]",
          icon:        "!mt-0.5",
          title:       "!text-sm !font-medium",
          description: "!text-xs !text-muted-foreground",
          default:     "!border-l-primary",
          success:     "!border-l-emerald-500",
          error:       "!border-l-destructive",
          warning:     "!border-l-amber-500",
          info:        "!border-l-primary",
        },
      }}
      style={
        {
          "--border-radius": "var(--radius)",
          "--font": "var(--font-sans)",
          "--width": "340px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
