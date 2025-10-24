import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Survey() {
  const [, navigate] = useLocation();
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Get token from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  // Validate survey token
  const { data: survey, isLoading, error } = useQuery<{
    referenceId: string;
    submissionType: string;
    token: string;
    expiresAt: string;
  }>({
    queryKey: [`/api/survey/validate/${token}`],
    enabled: !!token,
  });

  // Submit survey mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!token || selectedScore === null) {
        throw new Error("Missing required fields");
      }
      
      return await apiRequest("POST", "/api/survey/submit", {
        token,
        npsScore: selectedScore,
        feedback: feedback.trim() || undefined,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  // Redirect to home if no token
  useEffect(() => {
    if (!token) {
      setTimeout(() => navigate("/"), 2000);
    }
  }, [token, navigate]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Invalid Survey Link</CardTitle>
            <CardDescription>
              The survey link is missing required information. Redirecting to home page...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-600" />
            <CardTitle className="mt-4">Loading Survey...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Survey Not Available</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "This survey link is invalid, has expired, or has already been completed."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")} variant="outline" className="mt-4">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Thank You!</CardTitle>
            <CardDescription className="text-base">
              Your feedback has been submitted successfully. We truly appreciate you taking the time to help us improve our service.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")} variant="outline" className="mt-4">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
            <Star className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>
          <CardTitle className="text-2xl">How was your experience?</CardTitle>
          <CardDescription className="text-base">
            Thank you for using OfficeXpress! We'd love to hear your feedback about your recent experience (Reference: #{survey.referenceId}).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* NPS Rating Scale */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-center">
              On a scale of 0-10, how likely are you to recommend OfficeXpress to a friend or colleague?
            </h3>

            <div className="grid grid-cols-11 gap-2">
              {[...Array(11)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedScore(i)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg font-semibold transition-all
                    ${selectedScore === i
                      ? i <= 6
                        ? "bg-red-500 text-white scale-110 shadow-lg"
                        : i <= 8
                        ? "bg-yellow-500 text-white scale-110 shadow-lg"
                        : "bg-green-500 text-white scale-110 shadow-lg"
                      : "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-400"
                    }
                  `}
                  data-testid={`rating-${i}`}
                >
                  {i}
                </button>
              ))}
            </div>

            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
          </div>

          {/* Score Category Indicator */}
          {selectedScore !== null && (
            <div className="text-center py-2">
              <span className={`
                inline-block px-4 py-2 rounded-full font-medium text-sm
                ${selectedScore <= 6
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : selectedScore <= 8
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                }
              `}>
                {selectedScore <= 6 ? "Detractor" : selectedScore <= 8 ? "Passive" : "Promoter"}
              </span>
            </div>
          )}

          {/* Feedback Textarea */}
          <div className="space-y-2">
            <label htmlFor="feedback" className="text-sm font-medium">
              Additional Comments (Optional)
            </label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us more about your experience..."
              rows={4}
              className="resize-none"
              data-testid="textarea-feedback"
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={selectedScore === null || submitMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-submit-survey"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feedback"
              )}
            </Button>

            {submitMutation.error && (
              <div className="text-sm text-red-600 dark:text-red-400 text-center" data-testid="error-message">
                {submitMutation.error instanceof Error
                  ? submitMutation.error.message
                  : "Failed to submit survey. Please try again."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
