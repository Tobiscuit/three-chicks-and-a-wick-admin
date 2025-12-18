"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, X, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

  const statuses = ["ACTIVE", "DRAFT", "ARCHIVED"]

  // Filter suggestions based on input
  const suggestions = React.useMemo(() => {
    const term = inputValue.toLowerCase()
    
    const productMatches = products
      .filter(p => p.title.toLowerCase().includes(term))
      .slice(0, 5)
      .map(p => ({
        type: "product" as const,
        id: p.id,
        handle: p.handle,
        label: p.title,
        imageUrl: p.featuredImage?.url
      }))

    const tagMatches = allTags
      .filter(t => t.tag.includes(term) && !filters.some(f => f.type === "tag" && f.value === t.tag))
      .slice(0, 5)
      .map(t => ({
        type: "tag" as const,
        value: t.tag,
        label: t.tag,
        count: t.count
      }))

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
    inputRef.current?.focus()
  }

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index))
  }

  const clearAllFilters = () => {
    setFilters([])
    setInputValue("")
  }

  const handleProductClick = (handle: string) => {
    router.push(`/products/${handle}`)
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
      <div ref={containerRef} className="relative">
        {/* Single search input */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={filters.length > 0 ? `${filters.length} filter${filters.length > 1 ? 's' : ''} active...` : "Search products, tags, or status..."}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover/95 backdrop-blur-sm shadow-lg max-h-[300px] overflow-y-auto">
            {!hasSuggestions && !inputValue && (
              <div className="py-4 px-3 text-sm text-muted-foreground text-center">
                Start typing to search...
              </div>
            )}

            {!hasSuggestions && inputValue && (
              <button
                type="button"
                onClick={() => addFilter("search", inputValue.trim(), inputValue.trim())}
                className="w-full px-3 py-2 text-sm text-center hover:bg-accent cursor-pointer"
              >
                Press Enter to search for "{inputValue}"
              </button>
            )}

            {suggestions.productMatches.length > 0 && (
              <div className="p-1">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Products
                </div>
                {suggestions.productMatches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleProductClick(item.handle)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer text-left"
                  >
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                    )}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {suggestions.tagMatches.length > 0 && (
              <div className="p-1 border-t">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Tags
                </div>
                {suggestions.tagMatches.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => addFilter("tag", item.value, item.label)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                  >
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{item.count} products</span>
                  </button>
                ))}
              </div>
            )}

            {suggestions.statusMatches.length > 0 && (
              <div className="p-1 border-t">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Status
                </div>
                {suggestions.statusMatches.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => addFilter("status", item.value, item.label)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      item.value === "ACTIVE" && "bg-green-500",
                      item.value === "DRAFT" && "bg-yellow-500",
                      item.value === "ARCHIVED" && "bg-gray-500"
                    )} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
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
