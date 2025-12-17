"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, X, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
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
  const router = useRouter()

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
  }, [inputValue, products, allTags, filters, statuses])

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
        const term = filter.value.toLowerCase()
        filtered = filtered.filter(p => 
          p.title.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.tags.some(t => t.toLowerCase().includes(term))
        )
      }
    })

    onFilterChange(filtered)
  }, [filters, products, onFilterChange])

  const addFilter = (type: FilterChip["type"], value: string, label: string) => {
    // Don't add duplicate filters
    if (filters.some(f => f.type === type && f.value === value)) return
    
    setFilters(prev => [...prev, { type, value, label }])
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

  const handleProductSelect = (productId: string) => {
    router.push(`/products/${encodeURIComponent(productId)}`)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      addFilter("search", inputValue.trim(), inputValue.trim())
    }
    if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const hasSuggestions = 
    suggestions.productMatches.length > 0 || 
    suggestions.tagMatches.length > 0 || 
    suggestions.statusMatches.length > 0

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={filters.length > 0 ? `${filters.length} filter${filters.length > 1 ? 's' : ''} active - type to add more...` : "Search products, tags, or status..."}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            // Only close if clicking outside the popover
            const relatedTarget = e.relatedTarget as HTMLElement
            if (!relatedTarget?.closest('[data-radix-popper-content-wrapper]')) {
              // Delay to allow click events on popover items
              setTimeout(() => {
                if (!inputRef.current?.contains(document.activeElement)) {
                  setOpen(false)
                }
              }, 150)
            }
          }}
          onKeyDown={handleKeyDown}
          className="pl-10 h-10"
        />
        {open && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md">
            <Command shouldFilter={false}>
              <CommandList>
              {!hasSuggestions && !inputValue && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Start typing to search products, tags, or status...
                </div>
              )}
              
              {!hasSuggestions && inputValue && (
                <CommandItem
                  onSelect={() => addFilter("search", inputValue.trim(), inputValue.trim())}
                  className="justify-center cursor-pointer"
                >
                  Press Enter to search for "{inputValue}"
                </CommandItem>
              )}

              {suggestions.productMatches.length > 0 && (
                <CommandGroup heading="Products">
                  {suggestions.productMatches.map((suggestion) => (
                    <CommandItem
                      key={suggestion.value}
                      onSelect={() => handleProductSelect(suggestion.value)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {suggestion.imageUrl && (
                          <img 
                            src={suggestion.imageUrl} 
                            alt="" 
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <span className="truncate">{suggestion.label}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {suggestions.tagMatches.length > 0 && (
                <CommandGroup heading="Tags">
                  {suggestions.tagMatches.map((suggestion) => (
                    <CommandItem
                      key={suggestion.value}
                      onSelect={() => addFilter("tag", suggestion.value, suggestion.label)}
                      className="cursor-pointer"
                    >
                      <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{suggestion.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {suggestion.count} products
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {suggestions.statusMatches.length > 0 && (
                <CommandGroup heading="Status">
                  {suggestions.statusMatches.map((suggestion) => (
                    <CommandItem
                      key={suggestion.value}
                      onSelect={() => addFilter("status", suggestion.value, suggestion.label)}
                      className="cursor-pointer"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mr-2",
                        suggestion.value === "ACTIVE" && "bg-green-500",
                        suggestion.value === "DRAFT" && "bg-yellow-500",
                        suggestion.value === "ARCHIVED" && "bg-gray-500"
                      )} />
                      <span>{suggestion.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          </div>
        )}
      </div>

      {/* Active filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter, index) => (
            <Badge
              key={`${filter.type}-${filter.value}`}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-1"
            >
              {filter.type === "tag" && <Hash className="h-3 w-3" />}
              {filter.type === "status" && (
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  filter.value === "ACTIVE" && "bg-green-500",
                  filter.value === "DRAFT" && "bg-yellow-500",
                  filter.value === "ARCHIVED" && "bg-gray-500"
                )} />
              )}
              <span className="text-xs">{filter.label}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter(index)}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 text-xs text-muted-foreground"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
