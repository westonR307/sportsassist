"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { apiRequest } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function DebugHelper() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [campData, setCampData] = useState(`{
  "name": "Test Camp",
  "description": "A test camp for debugging",
  "streetAddress": "123 Test St",
  "city": "Test City",
  "state": "TS",
  "zipCode": "12345",
  "startDate": "${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}",
  "endDate": "${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()}",
  "registrationStartDate": "${new Date().toISOString()}",
  "registrationEndDate": "${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()}",
  "price": 100,
  "capacity": 20,
  "minAge": 8,
  "maxAge": 12,
  "sportId": 1,
  "skillLevel": "beginner",
  "type": "group",
  "visibility": "public",
  "schedules": [
    {
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "12:00"
    }
  ]
}`)
  const [response, setResponse] = useState("")

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setResponse("")

      // Parse the JSON data
      const data = JSON.parse(campData)

      // Make the API request
      const result = await apiRequest("POST", "/api/camps", data)

      // Get the response
      const contentType = result.headers.get("content-type");
      let responseData;
      
      if (contentType && contentType.includes("application/json")) {
        responseData = await result.json();
      } else {
        responseData = await result.text();
      }

      const formattedResponse = typeof responseData === 'string' 
        ? responseData 
        : JSON.stringify(responseData, null, 2);

      setResponse(formattedResponse)

      if (result.ok) {
        toast({
          title: "Success",
          description: "API request successful",
        })
      } else {
        toast({
          title: "Error",
          description: `API request failed with status ${result.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Debug request error:", error)
      setResponse(error.toString())
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API Debug Helper</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea value={campData} onChange={(e) => setCampData(e.target.value)} className="font-mono h-80" />
        </div>

        <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Request"
          )}
        </Button>

        {response && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Response:</h3>
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-80 text-sm">{response}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

