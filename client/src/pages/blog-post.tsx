import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Calendar, Tag, User, Clock, Share } from "lucide-react";
import { FaFacebook, FaLinkedin, FaTwitter } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BlogPost } from "@shared/schema";

export default function BlogPostPage() {
  const { slug } = useParams();
  
  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ["/api/blog-posts", slug],
    enabled: !!slug,
  });

  const { data: allPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-card">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-32 mb-8" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-8" />
            <Skeleton className="h-64 w-full mb-8" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-card flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-card-foreground mb-4">Blog Post Not Found</h1>
            <p className="text-muted-foreground mb-6">The blog post you're looking for doesn't exist or has been removed.</p>
            <Button asChild data-testid="back-to-blog">
              <Link href="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const relatedPosts = allPosts
    .filter(p => p.id !== post.id && p.category === post.category)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-card">
      {/* Blog Post Header */}
      <section className="py-16 bg-gradient-to-br from-brand-primary to-brand-secondary">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Button 
              variant="ghost" 
              className="text-primary-foreground/80 hover:text-primary-foreground mb-8"
              asChild
              data-testid="back-to-blog"
            >
              <Link href="/blog">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Link>
            </Button>
            
            <div className="flex items-center space-x-4 mb-6">
              <span className="bg-white/20 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {post.category}
              </span>
              <span className="text-primary-foreground/80 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(post.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-primary-foreground mb-6 leading-tight" data-testid="blog-post-title">
              {post.title}
            </h1>
            
            <p className="text-xl text-primary-foreground/80 leading-relaxed" data-testid="blog-post-excerpt">
              {post.excerpt}
            </p>
          </div>
        </div>
      </section>

      {/* Blog Post Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {post.featuredImage && (
              <img 
                src={post.featuredImage} 
                alt={post.title} 
                className="w-full h-64 lg:h-96 object-cover rounded-xl shadow-lg mb-12"
                data-testid="blog-post-featured-image"
              />
            )}
            
            <div className="prose prose-lg max-w-none">
              <div 
                className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
                data-testid="blog-post-content"
              >
                {post.content}
              </div>
            </div>

            {/* Author & Share Section */}
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-card-foreground">OfficeXpress Team</div>
                    <div className="text-sm text-muted-foreground">Transportation Experts</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground">Share this post:</span>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" data-testid="share-facebook">
                      <FaFacebook className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" data-testid="share-linkedin">
                      <FaLinkedin className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" data-testid="share-twitter">
                      <FaTwitter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-card-foreground mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Card key={relatedPost.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      {relatedPost.featuredImage && (
                        <img 
                          src={relatedPost.featuredImage} 
                          alt={relatedPost.title} 
                          className="w-full h-32 object-cover"
                          data-testid={`related-image-${relatedPost.id}`}
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="bg-brand-primary/20 text-brand-primary px-2 py-1 rounded text-xs font-medium">
                            {relatedPost.category}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(relatedPost.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-card-foreground mb-2 text-sm leading-tight">
                          {relatedPost.title}
                        </h3>
                        <Link 
                          href={`/blog/${relatedPost.slug}`} 
                          className="text-brand-primary text-sm font-medium hover:text-brand-primary/80 transition-colors"
                          data-testid={`related-read-more-${relatedPost.slug}`}
                        >
                          Read More →
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-card-foreground mb-4">
              Need Transportation Services?
            </h2>
            <p className="text-muted-foreground mb-8">
              Contact us today to discuss your transportation needs and get a customized solution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-brand-primary text-primary-foreground hover:bg-brand-primary/90"
                asChild
                data-testid="cta-corporate"
              >
                <Link href="/corporate">Corporate Services</Link>
              </Button>
              <Button 
                className="bg-brand-secondary text-secondary-foreground hover:bg-brand-secondary/90"
                asChild
                data-testid="cta-contact"
              >
                <Link href="/contact">Get in Touch</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
