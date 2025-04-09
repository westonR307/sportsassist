import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Calendar, ArrowRight, Sparkles, Trophy, Users, Zap, BadgeCheck, Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero Section with Enhanced Design */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Background Decoration */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary/5 rounded-bl-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-primary/10 rounded-tr-[200px]"></div>
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-block px-4 py-1 mb-6 bg-primary/20 rounded-full">
              <span className="text-sm font-medium text-primary">Your athlete's journey starts here</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 gradient-text bg-gradient-to-r from-primary to-primary/70">
              Find the Perfect Sports Camp for Your Athlete
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Browse hundreds of sports camps tailored to your athlete's interests, skill level, and location. From beginners to advanced players, we have options for everyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="font-semibold hover-lift btn-sports" asChild>
                <Link href="/find-camps">Browse Camps</Link>
              </Button>
              {!user && (
                <Button size="lg" variant="outline" className="font-semibold hover-lift" asChild>
                  <Link href="/auth">Sign Up</Link>
                </Button>
              )}
            </div>
          </div>
          
          {/* Floating Features Cards */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-80 space-y-4">
            <div className="card-shadow hover-lift p-4 bg-background/90 backdrop-blur-sm rounded-lg border border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <p className="font-medium">Top-rated coaches and programs</p>
              </div>
            </div>
            <div className="card-shadow hover-lift p-4 bg-background/90 backdrop-blur-sm rounded-lg border border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <p className="font-medium">Easy registration process</p>
              </div>
            </div>
            <div className="card-shadow hover-lift p-4 bg-background/90 backdrop-blur-sm rounded-lg border border-border/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <p className="font-medium">Build lifelong skills & friendships</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute -left-40 -top-40 w-80 h-80 bg-primary/5 rounded-full blur-xl"></div>
        <div className="absolute -right-40 -bottom-40 w-80 h-80 bg-primary/5 rounded-full blur-xl"></div>
        
        <div className="container relative mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 mb-4 bg-primary/20 rounded-full">
              <span className="text-sm font-medium text-primary">Why families love our platform</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Designed for Athletes & Parents</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform makes finding and registering for sports camps simple, so your athlete can focus on what matters most - improving their skills and having fun.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="camp-card p-6 hover-lift">
              <div className="w-14 h-14 rounded-2xl gradient-bg-blue flex items-center justify-center mb-6">
                <Search className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Find the Perfect Fit</h3>
              <p className="text-muted-foreground">
                Filter camps by sport, skill level, location, and age to find the perfect match for your athlete's unique needs and interests.
              </p>
              <div className="pt-4 mt-2 border-t">
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <BadgeCheck className="h-5 w-5 text-primary mr-2" />
                    <span>Advanced filtering options</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <BadgeCheck className="h-5 w-5 text-primary mr-2" />
                    <span>Detailed camp profiles</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="camp-card p-6 hover-lift">
              <div className="w-14 h-14 rounded-2xl gradient-bg-blue flex items-center justify-center mb-6">
                <MapPin className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Local or Virtual Options</h3>
              <p className="text-muted-foreground">
                Choose from in-person camps in your area or virtual sessions that can be attended from anywhere with an internet connection.
              </p>
              <div className="pt-4 mt-2 border-t">
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <BadgeCheck className="h-5 w-5 text-primary mr-2" />
                    <span>Location-based search</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <BadgeCheck className="h-5 w-5 text-primary mr-2" />
                    <span>Remote learning options</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="camp-card p-6 hover-lift">
              <div className="w-14 h-14 rounded-2xl gradient-bg-blue flex items-center justify-center mb-6">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Convenient Scheduling</h3>
              <p className="text-muted-foreground">
                Browse camps by date and find options that work with your busy schedule, from one-day intensives to week-long programs.
              </p>
              <div className="pt-4 mt-2 border-t">
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <BadgeCheck className="h-5 w-5 text-primary mr-2" />
                    <span>Calendar integration</span>
                  </li>
                  <li className="flex items-center text-sm">
                    <BadgeCheck className="h-5 w-5 text-primary mr-2" />
                    <span>Flexible date options</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="gradient-bg-blue text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBhNiA2IDAgMSAxLTEyIDAgNiA2IDAgMCAxIDEyIDB6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-15"></div>
        
        <div className="container relative mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-block px-4 py-1 mb-6 bg-white/20 backdrop-blur-sm rounded-full">
              <span className="text-sm font-medium text-white">Join thousands of happy athletes</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Find the Perfect Camp?</h2>
            <p className="text-xl opacity-90 mb-8">
              Explore our comprehensive database of sports camps and find the perfect opportunity for your athlete to learn, grow, and excel.
            </p>
            <Button size="lg" variant="secondary" className="font-semibold hover-lift btn-sports px-8" asChild>
              <Link href="/find-camps">
                Browse Camps <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-4xl font-bold">100+</div>
                <div className="text-white/70">Sports</div>
              </div>
              <div>
                <div className="text-4xl font-bold">5,000+</div>
                <div className="text-white/70">Camps</div>
              </div>
              <div>
                <div className="text-4xl font-bold">10,000+</div>
                <div className="text-white/70">Athletes</div>
              </div>
              <div>
                <div className="text-4xl font-bold">98%</div>
                <div className="text-white/70">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-primary/5 skew-y-3 -z-10 -translate-y-1/4"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1 mb-4 bg-primary/20 rounded-full">
              <span className="text-sm font-medium text-primary">Success stories</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Parents & Athletes Say</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Hear from families who found the perfect sports camps for their athletes on our platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="camp-card p-8 hover-lift bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="mb-6">
                <Heart className="h-8 w-8 text-red-500/20" />
              </div>
              <p className="italic text-muted-foreground mb-6 text-lg">
                "My daughter found her passion for basketball at a camp we discovered through this platform. The coaches were incredible and she made friends for life!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">SJ</span>
                </div>
                <div>
                  <p className="font-semibold">Sarah J.</p>
                  <p className="text-sm text-muted-foreground">Parent, California</p>
                </div>
              </div>
            </div>
            
            <div className="camp-card p-8 hover-lift bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="mb-6">
                <Heart className="h-8 w-8 text-red-500/20" />
              </div>
              <p className="italic text-muted-foreground mb-6 text-lg">
                "As a coach, I love that parents can easily find our camps. The registration process is seamless, and we've seen attendance increase by 30%."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">MT</span>
                </div>
                <div>
                  <p className="font-semibold">Coach Michael T.</p>
                  <p className="text-sm text-muted-foreground">Basketball Coach, New York</p>
                </div>
              </div>
            </div>
            
            <div className="camp-card p-8 hover-lift bg-background/80 backdrop-blur-sm md:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="mb-6">
                <Heart className="h-8 w-8 text-red-500/20" />
              </div>
              <p className="italic text-muted-foreground mb-6 text-lg">
                "Being able to filter by skill level was a game-changer. My son found a baseball camp that perfectly matched his intermediate skills without being intimidating."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">DR</span>
                </div>
                <div>
                  <p className="font-semibold">David R.</p>
                  <p className="text-sm text-muted-foreground">Parent, Texas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}