import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Autocomplete, type AutocompleteOption } from "@/components/ui/autocomplete";

interface BangladeshLocation {
  division: string;
  district: string;
  subordinate: string;
  branch: string;
  postCode: string;
  fullName: string;
}

interface LocationAutocompleteProps {
  value?: string;
  placeholder?: string;
  onSelect: (value: string) => void;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

async function searchLocations(query: string): Promise<BangladeshLocation[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  const response = await fetch(`/api/search-bangladesh-locations?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) {
    throw new Error('Failed to search locations');
  }
  
  return response.json();
}

export function LocationAutocomplete({
  value,
  placeholder = "Type to search for a location...",
  onSelect,
  className,
  error,
  disabled
}: LocationAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["/api/search-bangladesh-locations", debouncedQuery],
    queryFn: () => searchLocations(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const options: AutocompleteOption[] = locations.map((location) => ({
    value: location.fullName,
    label: formatLocationDisplay(location)
  }));

  return (
    <Autocomplete
      value={value}
      placeholder={placeholder}
      options={options}
      onSelect={onSelect}
      onSearch={handleSearch}
      loading={isLoading}
      className={className}
      error={error}
      disabled={disabled}
    />
  );
}

function formatLocationDisplay(location: BangladeshLocation): string {
  // Format: Branch, Subordinate, District, Division (PostCode)
  const parts = [
    location.branch,
    location.subordinate !== location.branch ? location.subordinate : null,
    location.district !== location.subordinate ? location.district : null,
    location.division !== location.district ? location.division : null
  ].filter(Boolean);
  
  return `${parts.join(", ")} (${location.postCode})`;
}