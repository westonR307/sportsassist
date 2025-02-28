import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1607962252666-2c33af3c6ba6')",
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="container mx-auto relative z-10 text-white">
          <h1 className="text-5xl font-bold mb-6">
            Transform Your Sports Camp Management
          </h1>
          <p className="text-xl mb-8 max-w-2xl">
            Streamline registrations, manage participants, and grow your sports
            camps with our comprehensive platform.
          </p>
          <Link href="/auth">
            <Button size="lg" className="text-lg">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Run Successful Sports Camps
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              title="Easy Registration"
              description="Simple and secure registration process for participants and their parents."
              image="https://images.unsplash.com/photo-1571008887538-b36bb32f4571"
            />
            <FeatureCard
              title="Camp Management"
              description="Comprehensive tools for managing camps, staff, and participants."
              image="https://images.unsplash.com/photo-1526232761682-d26e03ac148e"
            />
            <FeatureCard
              title="Payment Processing"
              description="Secure payment processing and financial management."
              image="https://images.unsplash.com/photo-1547602121-dec49dfbc1a5"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image: string;
}) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md">
      <div
        className="h-48 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
