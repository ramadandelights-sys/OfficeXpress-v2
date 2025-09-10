import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PortfolioClient } from "@shared/schema";

export default function About() {
  const { data: portfolioClients = [] } = useQuery<PortfolioClient[]>({
    queryKey: ["/api/portfolio-clients"],
  });

  const clientsWithTestimonials = portfolioClients.filter(client => client.testimonial);
  return (
    <div className="min-h-screen">
      {/* About Hero Section */}
      <section className="py-16 bg-brand-neutral">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <img 
                src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
                alt="Premium car ride experience" 
                className="rounded-xl shadow-lg w-full h-auto"
                data-testid="about-hero-image"
              />
            </div>
            <div className="lg:w-1/2">
              <h1 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-6">About OfficeXpress</h1>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                OfficeXpress provides employee transportation solutions across Bangladesh. Our products include Pick & Drop and Rental Services, both available on monthly contract or Ad Hoc basis.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                We also provide special airport pick and drop and city tours for foreigners with English-speaking, tech-savvy chauffeurs who ensure a comfortable and professional experience.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand-primary mb-2" data-testid="stat-vehicles">50+</div>
                  <div className="text-muted-foreground">Vehicles</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand-primary mb-2" data-testid="stat-clients">200+</div>
                  <div className="text-muted-foreground">Happy Clients</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand-primary mb-2" data-testid="stat-cities">15+</div>
                  <div className="text-muted-foreground">Cities Covered</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-brand-primary mb-2" data-testid="stat-experience">5+</div>
                  <div className="text-muted-foreground">Years Experience</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-white rounded-xl p-8 shadow-md border border-border">
              <h2 className="text-2xl font-bold text-card-foreground mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                To provide reliable, safe, and comfortable transportation services that enhance the daily commute experience for employees and businesses across Bangladesh. We strive to be the most trusted partner for corporate transportation needs.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-md border border-border">
              <h2 className="text-2xl font-bold text-card-foreground mb-4">Our Vision</h2>
              <p className="text-muted-foreground leading-relaxed">
                To become the leading transportation service provider in Bangladesh, known for our professionalism, reliability, and commitment to customer satisfaction. We envision a future where every journey is comfortable and stress-free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">Why Choose OfficeXpress?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We stand out in the transportation industry through our commitment to excellence and customer satisfaction.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚗</span>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Modern Fleet</h3>
              <p className="text-muted-foreground">Well-maintained vehicles with modern amenities for a comfortable journey.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👨‍💼</span>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Professional Drivers</h3>
              <p className="text-muted-foreground">Experienced, courteous, and English-speaking drivers for international clients.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-accent/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Punctual Service</h3>
              <p className="text-muted-foreground">Reliable timing and commitment to schedules for business efficiency.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-highlight/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Safety First</h3>
              <p className="text-muted-foreground">Comprehensive safety measures and insurance coverage for peace of mind.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Competitive Pricing</h3>
              <p className="text-muted-foreground">Affordable rates with flexible payment options and bulk discounts.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Affordable Service Options</h3>
              <p className="text-muted-foreground">From super affordable Toyota 100s to latest 2020+ model cars of any brand.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Client Testimonials */}
      {clientsWithTestimonials.length > 0 && (
        <section className="py-16 bg-card">
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
    </div>
  );
}
