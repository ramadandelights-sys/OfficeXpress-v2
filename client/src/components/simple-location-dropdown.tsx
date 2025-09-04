import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, X } from "lucide-react";
import bangladeshLocations from "@/data/bangladesh-locations.json";

interface BangladeshLocation {
  id: number;
  divisionId: number;
  divisionName: string;
  divisionNameBn: string | null;
  districtId: number;
  districtName: string;
  districtNameBn: string | null;
  upazilaId: number | null;
  upazilaName: string | null;
  upazilaNameBn: string | null;
  postOffice: string | null;
  postCode: string | null;
  fullLocationEn: string;
  fullLocationBn: string | null;
  searchText: string | null;
  locationType: string;
}

interface SimpleLocationDropdownProps {
  value?: string | null;
  placeholder?: string;
  onSelect: (value: string) => void;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

export function SimpleLocationDropdown({
  value,
  placeholder = "Type to search for a location...",
  onSelect,
  className,
  error,
  disabled
}: SimpleLocationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedValue, setSelectedValue] = useState(value || "");

  // Use static locations data (no API call needed)
  const allLocations = bangladeshLocations as BangladeshLocation[];
  const isLoading = false;

  // Filter locations based on search term
  const filteredLocations = useMemo(() => {
    if (!allLocations.length || !searchTerm.trim()) {
      return allLocations.slice(0, 50); // Show first 50 when no search
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    // Detect if search contains Bengali characters
    const containsBengali = /[\u0980-\u09FF]/.test(searchTerm);
    
    return allLocations
      .filter((location: BangladeshLocation) => {
        // Search in English fields
        const englishMatch = 
          location.fullLocationEn?.toLowerCase().includes(searchLower) ||
          location.districtName?.toLowerCase().includes(searchLower) ||
          location.divisionName?.toLowerCase().includes(searchLower) ||
          location.upazilaName?.toLowerCase().includes(searchLower) ||
          location.postOffice?.toLowerCase().includes(searchLower);

        // Search in Bengali fields if input contains Bengali
        const bengaliMatch = containsBengali && (
          location.fullLocationBn?.includes(searchTerm) ||
          location.districtNameBn?.includes(searchTerm) ||
          location.divisionNameBn?.includes(searchTerm) ||
          location.upazilaNameBn?.includes(searchTerm)
        );

        return englishMatch || bengaliMatch;
      })
      .slice(0, 100); // Limit results for performance
  }, [allLocations, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setSelectedValue(newValue);
    setIsOpen(true);
  };

  const handleSelect = (location: BangladeshLocation) => {
    const displayText = location.fullLocationEn;
    setSelectedValue(displayText);
    setSearchTerm("");
    setIsOpen(false);
    onSelect(displayText);
  };

  const handleClear = () => {
    setSelectedValue("");
    setSearchTerm("");
    setIsOpen(false);
    onSelect("");
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm("");
      }
    }
  };

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value || "");
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-location-dropdown]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} data-location-dropdown>
      <div className="relative">
        <Input
          type="text"
          value={isOpen ? searchTerm : selectedValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`pr-16 ${error ? 'border-red-500' : ''}`}
          data-testid="location-search-input"
        />
        
        <div className="absolute right-0 top-0 h-full flex items-center">
          {selectedValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100"
              onClick={handleClear}
              disabled={disabled}
              data-testid="clear-location-button"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-100"
            onClick={toggleDropdown}
            disabled={disabled}
            data-testid="toggle-dropdown-button"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-gray-500" data-testid="loading-locations">
              Loading locations...
            </div>
          ) : filteredLocations.length > 0 ? (
            <div className="py-1">
              {filteredLocations.map((location: BangladeshLocation) => (
                <button
                  key={location.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={() => handleSelect(location)}
                  data-testid={`location-option-${location.id}`}
                >
                  <div className="font-medium">{location.fullLocationEn}</div>
                  {location.fullLocationBn && (
                    <div className="text-xs text-gray-500 mt-1">{location.fullLocationBn}</div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-sm text-gray-500" data-testid="no-locations-found">
              {searchTerm ? 'No locations found' : 'Start typing to search...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}