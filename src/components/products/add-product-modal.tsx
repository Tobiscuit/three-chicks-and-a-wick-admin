"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileEdit, Sparkles, ArrowRight } from "lucide-react"

interface AddProductModalProps {
  trigger?: React.ReactNode
}

export function AddProductModal({ trigger }: AddProductModalProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleManual = () => {
    setOpen(false)
    router.push("/products/new")
  }

  const handleAIStudio = () => {
    setOpen(false)
    router.push("/")  // Image Studio is at root
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Choose how you'd like to add your product
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Manual Entry Option */}
          <button
            onClick={handleManual}
            className="group relative flex flex-col items-start gap-3 rounded-xl border-2 border-border p-5 text-left transition-all hover:border-primary/50 hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10">
                <FileEdit className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Manual Entry</h3>
                <p className="text-sm text-muted-foreground">
                  Fill out product details and upload images yourself
                </p>
              </div>
            </div>
            <ArrowRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
          </button>

          {/* AI Studio Option */}
          <button
            onClick={handleAIStudio}
            className="group relative flex flex-col items-start gap-3 rounded-xl border-2 border-border p-5 text-left transition-all hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 transition-colors">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  AI Image Studio
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Recommended
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Generate stunning product images with AI, then create product
                </p>
              </div>
            </div>
            <ArrowRight className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
