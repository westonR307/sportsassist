import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section */}
      <section className="relative bg-primary/10 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Find the Perfect Sports Camp for Your Athlete
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Browse hundreds of sports camps tailored to your athlete's interests, skill level, and location. From beginners to advanced players, we have options for everyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="font-semibold" asChild>
                <Link href="/find-camps">Browse Camps</Link>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" className="font-semibold" asChild>
                  <Link href="/auth">Sign Up</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Platform</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Find the Perfect Fit</h3>
              <p className="text-muted-foreground">
                Filter camps by sport, skill level, location, and age to find the perfect match for your athlete's unique needs and interests.
              </p>
            </div>
            <div className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Local or Virtual Options</h3>
              <p className="text-muted-foreground">
                Choose from in-person camps in your area or virtual sessions that can be attended from anywhere with an internet connection.
              </p>
            </div>
            <div className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Convenient Scheduling</h3>
              <p className="text-muted-foreground">
                Browse camps by date and find options that work with your busy schedule, from one-day intensives to week-long programs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Find the Perfect Camp?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Explore our comprehensive database of sports camps and find the perfect opportunity for your athlete to learn, grow, and excel.
          </p>
          <Button size="lg" className="font-semibold" asChild>
            <Link href="/find-camps">
              Browse Camps <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Featured Testimonials */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Parents & Athletes Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg bg-card">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="italic text-muted-foreground mb-4">
                "My daughter found her passion for basketball at a camp we discovered through this platform. The coaches were incredible and she made friends for life!"
              </p>
              <p className="font-semibold">- Sarah J., Parent</p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="italic text-muted-foreground mb-4">
                "As a coach, I love that parents can easily find our camps. The registration process is seamless, and we've seen attendance increase by 30%."
              </p>
              <p className="font-semibold">- Coach Michael T.</p>
            </div>
            <div className="p-6 border rounded-lg bg-card md:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="italic text-muted-foreground mb-4">
                "Being able to filter by skill level was a game-changer. My son found a baseball camp that perfectly matched his intermediate skills without being intimidating."
              </p>
              <p className="font-semibold">- David R., Parent</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}