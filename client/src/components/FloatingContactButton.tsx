import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function FloatingContactButton() {
  return (
    <div className="fixed bottom-6 left-6 z-50" data-testid="floating-contact-button">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/contact"
            className="flex items-center justify-center w-14 h-14 rounded-full bg-brand-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 ease-in-out"
            data-testid="link-floating-contact"
          >
            <MessageCircle className="w-6 h-6" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-brand-primary text-primary-foreground">
          <p>Contact Us</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
