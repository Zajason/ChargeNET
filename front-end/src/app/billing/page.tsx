"use client";
import { SideMenu } from '../../components/SideMenu';
import { MenuPanel } from '../../components/MenuPanel';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, CreditCard, Trash2, Menu } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  expiry?: string;
  isDefault: boolean;
}

interface ChargingSession {
  id: string;
  date: string;
  location: string;
  duration: string;
  energy: string;
  cost: string;
  status: 'completed' | 'pending';
}

export default function BillingScreen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiry: '12/25',
      isDefault: true,
    },
    {
      id: '2',
      type: 'card',
      last4: '5555',
      brand: 'Mastercard',
      expiry: '08/26',
      isDefault: false,
    },
  ]);

  const [chargingSessions] = useState<ChargingSession[]>([
    {
      id: '1',
      date: 'Jan 30, 2026',
      location: 'Downtown Charging Station',
      duration: '1h 23m',
      energy: '42.5 kWh',
      cost: '$12.75',
      status: 'completed',
    },
    {
      id: '2',
      date: 'Jan 28, 2026',
      location: 'Shopping Mall Charger',
      duration: '2h 15m',
      energy: '58.3 kWh',
      cost: '$17.49',
      status: 'completed',
    },
    {
      id: '3',
      date: 'Jan 25, 2026',
      location: 'Airport Parking',
      duration: '45m',
      energy: '28.1 kWh',
      cost: '$8.43',
      status: 'completed',
    },
    {
      id: '4',
      date: 'Jan 23, 2026',
      location: 'City Center Station',
      duration: '1h 05m',
      energy: '35.7 kWh',
      cost: '$10.71',
      status: 'completed',
    },
  ]);

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [newCard, setNewCard] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: '',
  });

  const handleAddPayment = () => {
    // TODO: Implement payment method addition logic
    console.log('Adding payment method:', newCard);
    setIsAddPaymentOpen(false);
    setNewCard({ cardNumber: '', expiry: '', cvc: '', name: '' });
  };

  const handleRemovePayment = (id: string) => {
    setPaymentMethods(paymentMethods.filter((pm) => pm.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(
      paymentMethods.map((pm) => ({
        ...pm,
        isDefault: pm.id === id,
      }))
    );
  };

  return (
    <div className="flex flex-col sm:flex-row h-screen w-full">
      {/* Mobile header */}
      <div className="sm:hidden flex items-center gap-3 p-3 bg-white border-b border-gray-200">
        <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-medium text-gray-900">Billing & History</h1>
      </div>
      <MenuPanel isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-6xl mx-auto p-6 sm:p-8 lg:p-12">
          <div className="mb-8">
            <h1 className="hidden sm:block text-2xl sm:text-3xl text-gray-900 mb-2">Billing & History</h1>
            <p className="text-sm text-gray-500">Manage payment methods and view charging history</p>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Payment Methods</h2>
              <Button onClick={() => setIsAddPaymentOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Payment
              </Button>
            </div>

            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {method.brand} •••• {method.last4}
                      </p>
                      <p className="text-xs text-gray-500">Expires {method.expiry}</p>
                    </div>
                    {method.isDefault && (
                      <span className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!method.isDefault && (
                      <Button
                        onClick={() => handleSetDefault(method.id)}
                        variant="outline"
                        size="sm"
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      onClick={() => handleRemovePayment(method.id)}
                      variant="outline"
                      size="sm"
                      disabled={method.isDefault}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charging History */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Charging History</h2>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Energy</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chargingSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="text-sm">{session.date}</TableCell>
                      <TableCell className="text-sm">{session.location}</TableCell>
                      <TableCell className="text-sm">{session.duration}</TableCell>
                      <TableCell className="text-sm">{session.energy}</TableCell>
                      <TableCell className="text-sm font-medium">{session.cost}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                            session.status === 'completed'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {session.status === 'completed' ? 'Completed' : 'Pending'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Total this month</p>
                <p className="text-lg font-medium text-gray-900">$49.38</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Menu - hidden on mobile, visible on sm+ */}
      <div className="hidden sm:block sm:w-80 lg:w-96 flex-shrink-0">
        <SideMenu />
      </div>

      {/* Add Payment Method Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new credit or debit card to your account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                value={newCard.cardNumber}
                onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                placeholder="1234 5678 9012 3456"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="name">Cardholder Name</Label>
              <Input
                id="name"
                value={newCard.name}
                onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                placeholder="John Doe"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  value={newCard.expiry}
                  onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                  placeholder="MM/YY"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  value={newCard.cvc}
                  onChange={(e) => setNewCard({ ...newCard, cvc: e.target.value })}
                  placeholder="123"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPayment}>Add Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
