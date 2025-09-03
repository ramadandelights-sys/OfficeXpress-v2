import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PortfolioClient } from "@shared/schema";

interface PortfolioTileProps {
  client: PortfolioClient;
}

export default function PortfolioTile({ client }: PortfolioTileProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const allImages = [client.logo, ...(client.images || [])];

  const navigateToNext = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const navigateToPrev = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="portfolio-tile bg-white rounded-lg shadow-md border border-border overflow-hidden group">
      <div className="h-full flex items-center justify-center p-8 relative">
        <img
          src={allImages[currentImageIndex]}
          alt={`${client.name} - Image ${currentImageIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          data-testid={`client-image-${client.id}`}
        />
        
        {allImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="portfolio-nav prev absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={navigateToPrev}
              data-testid={`prev-image-${client.id}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="portfolio-nav next absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={navigateToNext}
              data-testid={`next-image-${client.id}`}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
