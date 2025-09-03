import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Star } from "lucide-react";
import PortfolioTile from "@/components/portfolio-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PortfolioClient } from "@shared/schema";

export default function Portfolio() {
  const { data: portfolioClients = [], isLoading } = useQuery<PortfolioClient[]>({
    queryKey: ["/api/portfolio-clients"],
  });

  const clientsWithTestimonials = portfolioClients.filter(client => client.testimonial);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading portfolio...</p>
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
              Our Valued Clients
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
              Trusted by leading companies and satisfied customers across Bangladesh. See what our clients say about our services.
            </p>
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">Client Portfolio</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse through our portfolio of trusted partners and valued clients who rely on our transportation services.
            </p>
          </div>

          {portfolioClients.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📁</span>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">No Portfolio Items Yet</h3>
              <p className="text-muted-foreground">Our portfolio is being updated. Please check back soon.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {portfolioClients.map((client) => (
                <PortfolioTile key={client.id} client={client} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Client Testimonials */}
      {clientsWithTestimonials.length > 0 && (
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">What Our Clients Say</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Real feedback from our satisfied customers who trust us with their transportation needs.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {clientsWithTestimonials.map((client) => (
                <Card key={client.id} className="bg-white shadow-md border border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="text-yellow-400 flex space-x-1">
                        {[...Array(client.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4">{client.testimonial}</p>
                    <div className="flex items-center">
                      <img 
                        src={client.logo} 
                        alt={`${client.name} representative`}
                        className="w-12 h-12 rounded-full mr-4 object-cover"
                        data-testid={`testimonial-avatar-${client.id}`}
                      />
                      <div>
                        <div className="font-semibold text-card-foreground">
                          {client.clientRepresentative || "Client Representative"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {client.position || client.name}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">
              Ready to Join Our Portfolio?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Experience the same level of professional transportation service that our clients trust every day.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-[#4c9096] text-white hover:bg-[#4c9096]/90"
                asChild
                data-testid="cta-corporate"
              >
                <Link href="/corporate">Corporate Services</Link>
              </Button>
              <Button 
                variant="outline"
                className="border-2 border-[#4c9096] text-[#4c9096] hover:bg-[#4c9096] hover:text-white"
                asChild
                data-testid="cta-rental"
              >
                <Link href="/rental">Rental Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
