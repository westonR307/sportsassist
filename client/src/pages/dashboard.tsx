import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Camp, Child, insertChildSchema } from "@shared/schema";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { data: camps, isLoading: isLoadingCamps } = useQuery<Camp[]>({
    queryKey: ["/api/camps"],
  });

  const { data: children, isLoading: isLoadingChildren } = useQuery<Child[]>({
    queryKey: ["/api/children"],
    enabled: user?.role === "parent",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {user?.role === "parent" && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Children</h2>
              <AddChildDialog />
            </div>
            {isLoadingChildren ? (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {children?.map((child) => (
                  <ChildCard key={child.id} child={child} />
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold mb-4">Available Camps</h2>
          {isLoadingCamps ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {camps?.map((camp) => (
                <CampCard key={camp.id} camp={camp} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AddChildDialog() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm({
    resolver: zodResolver(insertChildSchema),
    defaultValues: {
      name: "",
      age: undefined,
    },
  });

  const addChildMutation = useMutation({
    mutationFn: async (data: { name: string; age: number }) => {
      console.log("Submitting data:", data); // Debug log
      const res = await apiRequest("POST", "/api/children", data);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to add child");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({
        title: "Success",
        description: "Child added successfully",
      });
      form.reset();
      setIsOpen(false);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error); // Debug log
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: { name: string; age: number | undefined }) => {
    console.log("Form submitted with data:", data); // Debug log
    const age = Number(data.age);
    if (isNaN(age) || age < 0 || age > 16) {
      form.setError("age", {
        type: "manual",
        message: "Age must be between 0 and 16",
      });
      return;
    }
    addChildMutation.mutate({
      name: data.name,
      age,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Child
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Child</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="16"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? undefined : Number(value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={addChildMutation.isPending}
            >
              {addChildMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Child
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ChildCard({ child }: { child: Child }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{child.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Age: {child.age}</p>
      </CardContent>
    </Card>
  );
}

function CampCard({ camp }: { camp: Camp }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{camp.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">{camp.description}</p>
        <div className="space-y-2">
          <div>
            <strong>Location:</strong> {camp.location}
          </div>
          <div>
            <strong>Dates:</strong>{" "}
            {new Date(camp.startDate).toLocaleDateString()} -{" "}
            {new Date(camp.endDate).toLocaleDateString()}
          </div>
          <div>
            <strong>Price:</strong> ${camp.price / 100}
          </div>
          <div>
            <strong>Capacity:</strong> {camp.capacity}
          </div>
          <Button className="w-full mt-4">Register</Button>
        </div>
      </CardContent>
    </Card>
  );
}