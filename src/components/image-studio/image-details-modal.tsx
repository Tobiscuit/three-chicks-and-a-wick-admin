"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Upload, Crop, X, Check } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"

interface ImageDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    imageUrl: string
    onReplace: (file: File) => void
    onRemove: () => void
    title?: string
}

export function ImageDetailsModal({
    isOpen,
    onClose,
    imageUrl,
    onReplace,
    onRemove,
    title = "Image Details"
}: ImageDetailsModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isHovering, setIsHovering] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onReplace(file)
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 bg-zinc-950 border-zinc-800 text-zinc-50">
                <DialogHeader className="p-4 border-b border-zinc-800 flex flex-row items-center justify-between">
                    <DialogTitle className="text-lg font-medium">{title}</DialogTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-400 hover:text-white">
                        <X className="h-4 w-4" />
                    </Button>
                </DialogHeader>

                <div className="flex-1 relative bg-zinc-900/50 flex items-center justify-center p-8 min-h-[400px]">
                    {/* Checkerboard pattern for transparency */}
                    <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                    }} />

                    <div className="relative z-10 max-w-full max-h-[60vh] shadow-2xl rounded-lg overflow-hidden ring-1 ring-white/10">
                        <Image
                            src={imageUrl}
                            alt="Preview"
                            width={800}
                            height={600}
                            className="object-contain max-h-[60vh] w-auto h-auto"
                            unoptimized
                        />
                    </div>
                </div>

                <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center sm:justify-between">
                    <div className="flex gap-2">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                onRemove();
                                onClose();
                            }}
                            className="bg-red-900/50 hover:bg-red-900 text-red-200 border-red-900"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                            <Crop className="w-4 h-4 mr-2" />
                            Crop
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Replace Image
                        </Button>
                    </div>

                    <Input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
