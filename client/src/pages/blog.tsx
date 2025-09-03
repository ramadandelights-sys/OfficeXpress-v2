import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Calendar, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BlogPost } from "@shared/schema";

export default function Blog() {
  const { data: blogPosts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading blog posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="py-16 bg-gradient-to-br from-brand-primary to-brand-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Latest Updates & Insights
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
              Stay updated with the latest news, transportation tips, and company announcements from OfficeXpress.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          {blogPosts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">No Blog Posts Yet</h3>
              <p className="text-muted-foreground">We're working on creating valuable content for you. Please check back soon.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <article key={post.id} className="bg-white rounded-xl shadow-md border border-border overflow-hidden hover:shadow-lg transition-shadow">
                  {post.featuredImage && (
                    <img 
                      src={post.featuredImage} 
                      alt={post.title} 
                      className="w-full h-48 object-cover"
                      data-testid={`blog-image-${post.id}`}
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="bg-brand-primary/20 text-brand-primary px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {post.category}
                      </span>
                      <span className="text-muted-foreground text-sm flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground mb-3" data-testid={`blog-title-${post.id}`}>
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground mb-4" data-testid={`blog-excerpt-${post.id}`}>
                      {post.excerpt}
                    </p>
                    <Link 
                      href={`/blog/${post.id}`} 
                      className="inline-flex items-center text-brand-primary font-semibold hover:text-brand-primary/80 transition-colors"
                      data-testid={`blog-read-more-${post.id}`}
                    >
                      Read More <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">Explore by Category</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find content that interests you most in our transportation industry insights.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📰</span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Industry News</h3>
                <p className="text-muted-foreground text-sm">Latest updates from the transportation sector.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-brand-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Safety Tips</h3>
                <p className="text-muted-foreground text-sm">Best practices for safe transportation.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-brand-accent/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🗺️</span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Travel Guide</h3>
                <p className="text-muted-foreground text-sm">Explore Bangladesh with our local insights.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-brand-highlight/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Company Updates</h3>
                <p className="text-muted-foreground text-sm">News and announcements from OfficeXpress.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
