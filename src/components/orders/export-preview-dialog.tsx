"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Download, Copy, FileSpreadsheet } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface ExportPreviewDialogProps {
    isOpen: boolean
    onClose: () => void
    data: { headers: string[]; rows: string[][] }
    type: 'production' | 'financial'
    onConfirm: () => void
}

export function ExportPreviewDialog({
    isOpen,
    onClose,
    data,
    type,
    onConfirm,
}: ExportPreviewDialogProps) {
    const { toast } = useToast()
    const [isCopying, setIsCopying] = useState(false)

    const handleCopy = async () => {
        setIsCopying(true)
        try {
            // Simple TSV copy for Excel pasting
            const tsv = [
                data.headers.join('\t'),
                ...data.rows.map(row => row.join('\t'))
            ].join('\n')

            await navigator.clipboard.writeText(tsv)
            toast({
                title: "Copied to clipboard",
                description: "You can paste this directly into Excel or Google Sheets.",
            })
        } catch (err) {
            console.error('Failed to copy', err)
            toast({
                variant: "destructive",
                title: "Failed to copy",
                description: "Please try downloading the CSV instead.",
            })
        } finally {
            setIsCopying(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Export Preview: {type === 'production' ? 'Production Manifest' : 'Financial Report'}
                    </DialogTitle>
                    <DialogDescription>
                        Review the data before downloading. This is what your CSV file will look like.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto border rounded-md my-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {data.headers.map((header, i) => (
                                    <TableHead key={i} className="whitespace-nowrap bg-muted/50 sticky top-0">
                                        {header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.rows.slice(0, 50).map((row, i) => (
                                <TableRow key={i}>
                                    {row.map((cell, j) => (
                                        <TableCell key={j} className="whitespace-nowrap max-w-[200px] truncate" title={cell}>
                                            {cell}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                            {data.rows.length > 50 && (
                                <TableRow>
                                    <TableCell colSpan={data.headers.length} className="text-center text-muted-foreground py-4">
                                        ... and {data.rows.length - 50} more rows
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <div className="flex items-center mr-auto text-sm text-muted-foreground">
                        {data.rows.length} rows found
                    </div>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="secondary" onClick={handleCopy} disabled={isCopying}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy to Clipboard
                    </Button>
                    <Button onClick={onConfirm}>
                        <Download className="mr-2 h-4 w-4" />
                        Download .CSV
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
