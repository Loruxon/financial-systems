import { useState } from "react"
import { AlertCircle, HelpCircle, Mail, MessageCircleQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

const TOPICS = [
  { value: "question",    label: "Вопрос",       icon: HelpCircle   },
  { value: "problem",     label: "Проблема",      icon: AlertCircle  },
] as const

type Topic = typeof TOPICS[number]["value"]

interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: string
  requestId: number
}

export function ContactDialog({ open, onOpenChange, invoice, requestId }: ContactDialogProps) {
  const { userEmail } = useAuth()
  const [topic, setTopic] = useState<Topic>("question")
  const [message, setMessage] = useState("")

  const topicLabel = TOPICS.find((t) => t.value === topic)?.label ?? ""
  const subject = `Заявка ${invoice} (ID ${requestId}) · ${topicLabel}`

  const handleClose = () => {
    onOpenChange(false)
    setTopic("question")
    setMessage("")
  }

  const handleSubmit = () => {
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="size-4 text-muted-foreground" />
            Написать в поддержку
          </DialogTitle>
          <DialogDescription>Опишите ваш вопрос, и мы ответим на вашу почту в ближайшее время.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">

          {/* Тема */}
          <div className="flex flex-col gap-2">
            <FieldLabel>Тема обращения</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {TOPICS.map(({ value, label, icon: Icon }) => {
                const selected = topic === value
                return (
                  <button
                    key={value}
                    onClick={() => setTopic(value)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3.5 py-3 text-sm transition-colors text-left",
                      selected
                        ? "border-primary/40 bg-primary/5 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Тема письма (авто) */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Тема письма</FieldLabel>
            <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground select-none">
              {subject}
            </div>
          </div>

          {/* Сообщение */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Сообщение</FieldLabel>
            <Textarea
              placeholder="Опишите ваш вопрос или проблему..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Куда придёт ответ */}
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Mail className="size-4 shrink-0 text-primary" />
            Ответ придёт на почту <span className="font-semibold">{userEmail ?? "вашего личного кабинета"}</span>
          </div>

        </div>

        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={handleClose}>
            Отмена
          </Button>
          <Button size="lg" disabled={!message.trim()} onClick={handleSubmit}>
            Отправить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
