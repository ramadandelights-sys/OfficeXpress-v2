import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteProps {
  value?: string;
  placeholder?: string;
  options: AutocompleteOption[];
  onSelect: (value: string) => void;
  onSearch: (query: string) => void;
  loading?: boolean;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

export function Autocomplete({
  value,
  placeholder = "Search...",
  options,
  onSelect,
  onSearch,
  loading = false,
  className,
  error,
  disabled
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue.trim().length >= 2) {
        onSearch(inputValue.trim());
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue, onSearch]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleOptionSelect = (option: AutocompleteOption) => {
    setInputValue(option.label);
    onSelect(option.value);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue("");
    onSelect("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => prev > 0 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleOptionSelect(options[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          className={cn(
            "pr-10",
            error && "border-red-500 focus:border-red-500"
          )}
          disabled={disabled}
          data-testid="autocomplete-input"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={handleClear}
              disabled={disabled}
              data-testid="autocomplete-clear"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Searching...
            </div>
          ) : options.length > 0 ? (
            <ul ref={listRef} className="py-1" role="listbox">
              {options.map((option, index) => (
                <li
                  key={option.value}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-gray-100",
                    highlightedIndex === index && "bg-gray-100",
                    value === option.value && "bg-blue-50 text-blue-600"
                  )}
                  onClick={() => handleOptionSelect(option)}
                  role="option"
                  aria-selected={value === option.value}
                  data-testid={`autocomplete-option-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {value === option.value && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : inputValue.trim().length >= 2 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No locations found
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  );
}