import { useHandleSignInCallback } from "@logto/react"
import { useNavigate } from "react-router"
import { Spinner } from "@/components/ui/spinner"

export default function CallbackPage() {
  const navigate = useNavigate()
  const { isLoading } = useHandleSignInCallback(() => navigate("/"))

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Spinner className="size-6 text-muted-foreground" /></div>
  return null
}
