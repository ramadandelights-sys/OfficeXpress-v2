import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { Link } from "wouter";
import type { LegalPage } from "@shared/schema";

export default function LegalPageView() {
  const [location] = useLocation();
  
  // Extract the page type from the URL (e.g., /terms -> terms, /privacy -> privacy)
  const pageType = location.replace('/', '');
  
  const { data: legalPages = [], isLoading, error } = useQuery<LegalPage[]>({
    queryKey: ["/api/admin/legal-pages"],
  });

  const page = legalPages.find(p => p.type === pageType);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                <div className="h-4 bg-gray-300 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Page Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              The legal page you're looking for doesn't exist or is not available.
            </p>
            <Link href="/">
              <Button className="bg-[#4c9096] hover:bg-[#4c9096]/90 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Navigation */}
          <div className="mb-8">
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Legal Page Content */}
          <Card>
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none dark:prose-invert">
                {/* Page Title */}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6" data-testid="heading-legal-title">
                  {page.title}
                </h1>
                
                {/* Last Updated */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8" data-testid="text-last-updated">
                  Last Updated: {new Date(page.lastUpdated).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>

                {/* Legal Content */}
                <div 
                  className="legal-content"
                  dangerouslySetInnerHTML={{ __html: page.content }}
                  data-testid="content-legal-text"
                />
              </div>

              {/* Contact Information Footer */}
              <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Questions about this {page.type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    If you have any questions or concerns about our {page.type === 'terms' ? 'terms of service' : 'privacy practices'}, please don't hesitate to contact us.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/contact">
                      <Button className="bg-[#4c9096] hover:bg-[#4c9096]/90 text-white" data-testid="button-contact">
                        Contact Us
                      </Button>
                    </Link>
                    <a href="mailto:info@officexpress.org">
                      <Button variant="outline" data-testid="button-email">
                        Email: info@officexpress.org
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}