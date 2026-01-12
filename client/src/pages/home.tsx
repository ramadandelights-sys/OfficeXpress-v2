import { Link } from "wouter";
import { Calendar, Play, Building, Car, Plane, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { PortfolioClient, BlogPost } from "@shared/schema";
import gulshanCircleImage from "@assets/gulshan-circle-2-azim-khan-ronnie_1768251395903.jpg";

export default function Home() {
  const { t } = useTranslation();
  
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
                {t('home.heroTitle')}
              </h1>
              <p className="text-xl text-primary-foreground/80 mb-8 leading-relaxed">
                {t('home.heroDescription')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  className="bg-[#4c9096] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#4c9096]/90 transition-colors"
                  asChild
                  data-testid="book-service-btn"
                >
                  <Link href="/corporate">
                    <Calendar className="mr-2 w-5 h-5" />
                    {t('home.bookService')}
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
                    {t('home.learnMore')}
                  </Link>
                </Button>
              </div>
            </div>
            <div className="lg:w-1/2">
              <img 
                src={gulshanCircleImage} 
                alt="Gulshan Circle 2 Dhaka" 
                className="rounded-xl shadow-2xl w-full h-[500px] object-cover"
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
            <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">{t('home.servicesTitle')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('home.servicesDescription')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Corporate Services */}
            <div className="service-card bg-white rounded-xl p-8 shadow-md border border-border">
              <div className="w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mb-6">
                <Building className="text-brand-primary w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">{t('home.corporateTitle')}</h3>
              <p className="text-muted-foreground mb-6">{t('home.corporateDescription')}</p>
              <Link 
                href="/corporate" 
                className="inline-flex items-center text-brand-primary font-semibold hover:text-brand-primary/80 transition-colors"
                data-testid="corporate-learn-more"
              >
                {t('home.learnMore')} <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Rental Services */}
            <div className="service-card bg-white rounded-xl p-8 shadow-md border border-border">
              <div className="w-16 h-16 bg-brand-secondary/20 rounded-lg flex items-center justify-center mb-6">
                <Car className="text-brand-secondary w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">{t('home.rentalTitle')}</h3>
              <p className="text-muted-foreground mb-6">{t('home.rentalDescription')}</p>
              <Link 
                href="/rental" 
                className="inline-flex items-center text-brand-primary font-semibold hover:text-brand-primary/80 transition-colors"
                data-testid="rental-learn-more"
              >
                {t('home.learnMore')} <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Airport Services */}
            <div className="service-card bg-white rounded-xl p-8 shadow-md border border-border">
              <div className="w-16 h-16 bg-brand-accent/20 rounded-lg flex items-center justify-center mb-6">
                <Plane className="text-accent-foreground w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-4">{t('home.airportTitle')}</h3>
              <p className="text-muted-foreground mb-6">{t('home.airportDescription')}</p>
              <Link 
                href="/rental?service=airport" 
                className="inline-flex items-center text-brand-primary font-semibold hover:text-brand-primary/80 transition-colors"
                data-testid="airport-learn-more"
              >
                {t('home.bookNow')} <ArrowRight className="ml-2 w-4 h-4" />
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
              <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">{t('home.portfolioTitle')}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('home.portfolioDescription')}
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
                <Link href="/portfolio">{t('home.viewFullPortfolio')}</Link>
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
              <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">{t('home.blogTitle')}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('home.blogDescription')}
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
                <Link href="/blog">{t('home.viewAllPosts')}</Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
