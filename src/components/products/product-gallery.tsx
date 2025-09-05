
"use client"

import * as React from "react"
import Image from "next/image"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"

type ImageNode = {
    url: string;
    altText: string | null;
}

type ProductGalleryProps = {
    productTitle: string;
    images: ImageNode[];
}

export function ProductGallery({ productTitle, images }: ProductGalleryProps) {
  const [api, setApi] = React.useState<any>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)
 
  React.useEffect(() => {
    if (!api) {
      return
    }
 
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)
 
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  const hasImages = images && images.length > 0;
  const displayImages = hasImages ? images : [{ url: 'https://placehold.co/800x800', altText: 'Placeholder image' }];

  return (
    <div className="grid gap-4">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {displayImages.map((image, index) => (
            <CarouselItem key={index}>
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-0">
                   <Image
                        src={image.url}
                        alt={image.altText || productTitle}
                        width={800}
                        height={800}
                        className="rounded-lg object-cover w-full h-full"
                        priority={index === 0}
                    />
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        {displayImages.length > 1 && (
            <>
                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
            </>
        )}
      </Carousel>
       {displayImages.length > 1 && (
          <div className="py-2 text-center text-sm text-muted-foreground">
            Image {current} of {count}
          </div>
        )}
    </div>
  )
}
