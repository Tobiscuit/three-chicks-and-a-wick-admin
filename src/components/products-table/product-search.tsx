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
      .slice(0, 5)
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

  const hasSuggestions = 
    suggestions.productMatches.length > 0 || 
    suggestions.tagMatches.length > 0 || 
    suggestions.statusMatches.length > 0

  return (
    <div className="w-full space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start text-muted-foreground font-normal h-10"
          >
            <Search className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {filters.length > 0 
                ? `${filters.length} filter${filters.length > 1 ? 's' : ''} active` 
                : "Search products, tags, or status..."}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[--radix-popover-trigger-width] p-0 bg-popover/90 backdrop-blur-md shadow-xl" 
          align="start"
        >
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Type to search..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            <CommandList>
              {!hasSuggestions && !inputValue && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Start typing to search products, tags, or status...
                </div>
              )}

              {!hasSuggestions && inputValue && (
                <div className="py-2 px-2">
                  <button
                    onClick={() => addFilter("search", inputValue.trim(), inputValue.trim())}
                    className="w-full rounded-sm px-2 py-1.5 text-sm text-center hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    Search for "{inputValue}"
                  </button>
                </div>
              )}

              {suggestions.productMatches.length > 0 && (
                <CommandGroup heading="Products" forceMount>
                  {suggestions.productMatches.map((suggestion) => (
                    <CommandItem
                      key={suggestion.value}
                      value={suggestion.value}
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
                <CommandGroup heading="Tags" forceMount>
                  {suggestions.tagMatches.map((suggestion) => (
                    <CommandItem
                      key={suggestion.value}
                      value={suggestion.value}
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
                <CommandGroup heading="Status" forceMount>
                  {suggestions.statusMatches.map((suggestion) => (
                    <CommandItem
                      key={suggestion.value}
                      value={suggestion.value}
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
        </PopoverContent>
      </Popover>

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
