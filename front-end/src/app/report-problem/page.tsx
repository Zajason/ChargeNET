"use client";
import { SideMenu } from '../../components/SideMenu';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { CheckCircle2 } from 'lucide-react';

export default function ReportProblemScreen() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    location: '',
    subject: '',
    description: '',
    email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement problem report submission
    console.log('Submitting problem report:', formData);
    setSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        category: '',
        location: '',
        subject: '',
        description: '',
        email: '',
      });
    }, 9876);
  };

  const handleReset = () => {
    setFormData({
      category: '',
      location: '',
      subject: '',
      description: '',
      email: '',
    });
  };

  if (submitted) {
    return (
      <div className="flex h-screen w-full">
        {/* Main Content Area - 3/4 of screen */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Report Submitted</h2>
            <p className="text-gray-500">
              We've received your problem report and will get back to you soon.
            </p>
          </div>
        </div>

        {/* Side Menu - 1/4 of screen */}
        <div className="w-full sm:w-80 lg:w-96 flex-shrink-0">
          <SideMenu />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      {/* Main Content Area - 3/4 of screen */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-3xl mx-auto p-6 sm:p-8 lg:p-12">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl text-gray-900 mb-2">Report a Problem</h1>
            <p className="text-sm text-gray-500">
              Let us know about any issues you're experiencing
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-6">
              {/* Category */}
              <div>
                <Label htmlFor="category">Problem Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="charger-not-working">Charger Not Working</SelectItem>
                    <SelectItem value="damaged-equipment">Damaged Equipment</SelectItem>
                    <SelectItem value="payment-issue">Payment Issue</SelectItem>
                    <SelectItem value="app-issue">App Issue</SelectItem>
                    <SelectItem value="reservation-problem">Reservation Problem</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">Charger Location (if applicable)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Downtown Charging Station"
                  className="mt-1"
                />
              </div>

              {/* Subject */}
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of the issue"
                  className="mt-1"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Please provide as much detail as possible about the problem..."
                  className="mt-1 min-h-[150px]"
                  required
                />
              </div>

              {/* Contact Email */}
              <div>
                <Label htmlFor="email">Contact Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="mt-1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll use this email to follow up on your report
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={!formData.category || !formData.subject || !formData.description || !formData.email}>
                  Submit Report
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </div>
          </form>

          {/* Additional Help Section */}
          <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Need Immediate Help?</h3>
            <p className="text-sm text-gray-500">
              For urgent issues, please contact our support team:
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-gray-700">Phone: 1-800-CHARGER (24/7)</p>
              <p className="text-sm text-gray-700">Email: support@chargepoint.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Side Menu - 1/4 of screen */}
      <div className="w-full sm:w-80 lg:w-96 flex-shrink-0">
        <SideMenu />
      </div>
    </div>
  );
}
