import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Phone, Video, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ChatDoctorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat with Doctor</h1>
          <p className="text-muted-foreground">Get veterinary advice and consultation.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <MessageCircle className="mr-2 h-4 w-4" />
          New Consultation
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Doctors</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">Online now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Ongoing consultations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Consultations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Available Doctors */}
        <Card>
          <CardHeader>
            <CardTitle>Available Doctors</CardTitle>
            <CardDescription>Veterinarians ready for consultation.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">DR</span>
                  </div>
                  <div>
                    <p className="font-medium">Dr. Sharma</p>
                    <p className="text-sm text-muted-foreground">Poultry Specialist</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">DR</span>
                  </div>
                  <div>
                    <p className="font-medium">Dr. Patel</p>
                    <p className="text-sm text-muted-foreground">Disease Expert</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Chat
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Consultations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Consultations</CardTitle>
            <CardDescription>Your latest veterinary consultations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Batch #B-2024-001 Health Check</p>
                  <p className="text-sm text-muted-foreground">Dr. Sharma • 2 hours ago</p>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Vaccination Schedule</p>
                  <p className="text-sm text-muted-foreground">Dr. Patel • Yesterday</p>
                </div>
                <Badge variant="default" className="bg-blue-100 text-blue-800">Scheduled</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Disease Prevention</p>
                  <p className="text-sm text-muted-foreground">Dr. Kumar • 3 days ago</p>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
