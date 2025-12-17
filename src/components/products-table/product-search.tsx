"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Tag, Filter, X, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { ShopifyProduct } from "@/services/shopify"

type FilterChip = {
  type: "tag" | "status" | "search"
  value: string
  label: string
}

interface ProductSearchProps {
  products: ShopifyProduct[]
  onFilterChange: (filteredProducts: ShopifyProduct[]) => void
}

export function ProductSearch({ products, onFilterChange }: ProductSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [filters, setFilters] = React.useState<FilterChip[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Extract unique tags from products
  const allTags = React.useMemo(() => {
    const tagMap = new Map<string, number>()
    products.forEach(product => {
      product.tags.forEach(tag => {
        tagMap.set(tag.toLowerCase(), (tagMap.get(tag.toLowerCase()) || 0) + 1)
      })
    })
    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
  }, [products])

  // Extract unique statuses
  const statuses = ["ACTIVE", "DRAFT", "ARCHIVED"]

  // Filter suggestions based on input
  const suggestions = React.useMemo(() => {
    const term = inputValue.toLowerCase()
    
    // Product matches
    const productMatches = products
      .filter(p => p.title.toLowerCase().includes(term))
      .slice(0, 3)
      .map(p => ({
        type: "product" as const,
        value: p.id,
        label: p.title,
        imageUrl: p.featuredImage?.url
      }))

    // Tag matches
    const tagMatches = allTags
      .filter(t => t.tag.includes(term) && !filters.some(f => f.type === "tag" && f.value === t.tag))
      .slice(0, 5)
      .map(t => ({
        type: "tag" as const,
        value: t.tag,
        label: t.tag,
        count: t.count
      }))

    // Status matches
    const statusMatches = statuses
      .filter(s => s.toLowerCase().includes(term) && !filters.some(f => f.type === "status" && f.value === s))
      .map(s => ({
        type: "status" as const,
        value: s,
        label: s.charAt(0) + s.slice(1).toLowerCase()
      }))

    return { productMatches, tagMatches, statusMatches }
  }, [inputValue, products, allTags, filters])

  // Apply filters to products
  React.useEffect(() => {
    let filtered = [...products]
    
    filters.forEach(filter => {
      if (filter.type === "tag") {
        filtered = filtered.filter(p => 
          p.tags.some(t => t.toLowerCase() === filter.value.toLowerCase())
        )
      } else if (filter.type === "status") {
        filtered = filtered.filter(p => p.status === filter.value)
      } else if (filter.type === "search") {
        filtered = filtered.filter(p => 
          p.title.toLowerCase().includes(filter.value.toLowerCase()) ||
          p.tags.some(t => t.toLowerCase().includes(filter.value.toLowerCase()))
        )
      }
    })
    
    onFilterChange(filtered)
  }, [filters, products, onFilterChange])

  const addFilter = (type: FilterChip["type"], value: string, label: string) => {
    // For search type, replace existing search filter
    if (type === "search") {
      setFilters(prev => [...prev.filter(f => f.type !== "search"), { type, value, label }])
    } else {
      setFilters(prev => [...prev, { type, value, label }])
    }
    setInputValue("")
    setOpen(false)
  }

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index))
  }

  const clearAllFilters = () => {
    setFilters([])
    setInputValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      addFilter("search", inputValue.trim(), inputValue.trim())
    }
    if (e.key === "Backspace" && !inputValue && filters.length > 0) {
      removeFilter(filters.length - 1)
    }
  }

  const router = useRouter()
  const handleProductSelect = (productId: string) => {
    router.push(`/products/${encodeURIComponent(productId)}`)
    setOpen(false)
  }

  return (
    <div className="w-full space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div 
            className="relative cursor-text"
            onClick={() => {
              setOpen(true)
              inputRef.current?.focus()
            }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search products, tags, or status..."
              className="w-full pl-10 pr-10"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                if (!open) setOpen(true)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setOpen(true)}
            />
            {(inputValue || filters.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  clearAllFilters()
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[--radix-popover-trigger-width] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                {inputValue ? (
                  <>
                    Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Enter</kbd> to search for "{inputValue}"
                  </>
                ) : (
                  "Start typing to search..."
                )}
              </CommandEmpty>
              
              {suggestions.productMatches.length > 0 && (
                <CommandGroup heading="Products">
                  {suggestions.productMatches.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.value}
                      onSelect={() => handleProductSelect(item.value)}
                      className="cursor-pointer"
                    >
                      <span className="truncate">{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {suggestions.tagMatches.length > 0 && (
                <CommandGroup heading="Tags">
                  {suggestions.tagMatches.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.value}
                      onSelect={() => addFilter("tag", item.value, item.label)}
                      className="cursor-pointer"
                    >
                      <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {item.count} products
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {suggestions.statusMatches.length > 0 && (
                <CommandGroup heading="Status">
                  {suggestions.statusMatches.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.value}
                      onSelect={() => addFilter("status", item.value, item.label)}
                      className="cursor-pointer"
                    >
                      <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>status: {item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {!inputValue && allTags.length > 0 && (
                <CommandGroup heading="Popular Tags">
                  {allTags.slice(0, 5).map((item) => (
                    <CommandItem
                      key={item.tag}
                      value={item.tag}
                      onSelect={() => addFilter("tag", item.tag, item.tag)}
                      className="cursor-pointer"
                    >
                      <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{item.tag}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {item.count}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Filter chips */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 motion-safe:animate-in motion-safe:fade-in">
          {filters.map((filter, index) => (
            <Badge
              key={`${filter.type}-${filter.value}`}
              variant="secondary"
              className={cn(
                "gap-1 pr-1 cursor-pointer hover:bg-secondary/80 transition-colors",
                filter.type === "tag" && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
                filter.type === "status" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                filter.type === "search" && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              )}
              onClick={() => removeFilter(index)}
            >
              {filter.type === "tag" && <Hash className="h-3 w-3" />}
              {filter.type === "status" && <Filter className="h-3 w-3" />}
              {filter.type === "search" && <Search className="h-3 w-3" />}
              {filter.label}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={clearAllFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
