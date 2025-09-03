import { Link } from "wouter";
import { Calendar, Play, Building, Car, Plane, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { PortfolioClient, BlogPost } from "@shared/schema";

export default function Home() {
  const { data: portfolioClients = [] } = useQuery<PortfolioClient[]>({
    queryKey: ["/api/portfolio-clients"],
  });

  const { data: blogPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts"],
  });

  const featuredClients = portfolioClients.slice(0, 4);
  const latestPosts = blogPosts.slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-brand-primary to-brand-secondary py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-10 lg:mb-0">
              <h1 className="text-4xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
                Professional Transportation Solutions
              </h1>
              <p className="text-xl text-primary-foreground/80 mb-8 leading-relaxed">
                Reliable employee transportation, rental services, and airport transfers across Bangladesh. 
                Experience comfort and punctuality with our professional chauffeur services.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  className="bg-[#4c9096] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#4c9096]/90 transition-colors"
                  asChild
                  data-testid="book-service-btn"
                >
                  <Link href="/corporate">
                    <Calendar className="mr-2 w-5 h-5" />
                    Book Service
                  </Link>
                </Button>
                <Button 
                  variant="outline"
                  className="border-2 border-[#4c9096] text-[#4c9096] bg-white px-8 py-4 rounded-lg font-semibold hover:bg-[#4c9096] hover:text-white transition-colors"
                  asChild
                  data-testid="learn-more-btn"
                >
                  <Link href="/about">
                    <Play className="mr-2 w-5 h-5" />
                    Learn More
                  </Link>
                </Button>
              </div>
            </div>
            <div className="lg:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
                alt="Professional transportation fleet" 
                className="rounded-xl shadow-2xl w-full h-auto"
                data-testid="hero-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">Our Transportation Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From daily office commutes to special airport transfers, we provide comprehensive transportation solutions for individuals and businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Corporate Services */}
            <div className="service-card bg-white rounded-xl p-8 shadow-md border border-border">
              <div className="w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mb-6">
                <Building className="text-brand-primary w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">Corporate Services</h3>
              <p className="text-muted-foreground mb-6">Professional pick & drop services for employees, monthly contracts, and corporate fleet management.</p>
              <Link 
                href="/corporate" 
                className="inline-flex items-center text-brand-primary font-semibold hover:text-brand-primary/80 transition-colors"
                data-testid="corporate-learn-more"
              >
                Learn More <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Rental Services */}
            <div className="service-card bg-white rounded-xl p-8 shadow-md border border-border">
              <div className="w-16 h-16 bg-brand-secondary/20 rounded-lg flex items-center justify-center mb-6">
                <Car className="text-brand-secondary w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">Vehicle Rental</h3>
              <p className="text-muted-foreground mb-6">Quality cars at affordable rates across Bangladesh with professional chauffeur support for city tours.</p>
              <Link 
                href="/rental" 
                className="inline-flex items-center text-brand-secondary font-semibold hover:text-brand-secondary/80 transition-colors"
                data-testid="rental-learn-more"
              >
                Learn More <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Airport Services */}
            <div className="service-card bg-white rounded-xl p-8 shadow-md border border-border">
              <div className="w-16 h-16 bg-brand-accent/20 rounded-lg flex items-center justify-center mb-6">
                <Plane className="text-accent-foreground w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">Airport Transfers</h3>
              <p className="text-muted-foreground mb-6">Reliable airport pickup and drop services with English-speaking, tech-savvy chauffeurs for foreign visitors.</p>
              <Link 
                href="/contact" 
                className="inline-flex items-center text-accent-foreground font-semibold hover:text-accent-foreground/80 transition-colors"
                data-testid="airport-learn-more"
              >
                Learn More <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Preview */}
      {featuredClients.length > 0 && (
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">Trusted by Leading Companies</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                See who trusts us with their transportation needs across Bangladesh.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {featuredClients.map((client) => (
                <div key={client.id} className="bg-white rounded-lg shadow-md border border-border p-6 flex items-center justify-center aspect-square">
                  <img
                    src={client.logo}
                    alt={`${client.name} logo`}
                    className="max-w-full max-h-full object-contain"
                    data-testid={`client-logo-${client.id}`}
                  />
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button 
                className="bg-[#4c9096] text-white hover:bg-[#4c9096]/90"
                asChild 
                data-testid="view-portfolio-btn"
              >
                <Link href="/portfolio">View Full Portfolio</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Latest Blog Posts */}
      {latestPosts.length > 0 && (
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">Latest Updates</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Stay informed with our latest news and insights from the transportation industry.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {latestPosts.map((post) => (
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
                      <span className="bg-brand-primary/20 text-brand-primary px-3 py-1 rounded-full text-sm font-medium">
                        {post.category}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground mb-3">{post.title}</h3>
                    <p className="text-muted-foreground mb-4">{post.excerpt}</p>
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

            <div className="text-center">
              <Button 
                variant="outline"
                className="border-2 border-[#4c9096] text-[#4c9096] hover:bg-[#4c9096] hover:text-white"
                asChild 
                data-testid="view-blog-btn"
              >
                <Link href="/blog">View All Posts</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
