"use client";
import { SideMenu } from '../../components/SideMenu';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: string;
  batteryCapacity: string;
  maxChargingSpeed: string;
}

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: '1',
      brand: 'Tesla',
      model: 'Model 3',
      year: '2023',
      batteryCapacity: '75',
      maxChargingSpeed: '250',
    },
    {
      id: '2',
      brand: 'Chevrolet',
      model: 'Bolt EV',
      year: '2022',
      batteryCapacity: '65',
      maxChargingSpeed: '55',
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newVehicle, setNewVehicle] = useState<Omit<Vehicle, 'id'>>({
    brand: '',
    model: '',
    year: '',
    batteryCapacity: '',
    maxChargingSpeed: '',
  });

  const handleAddVehicle = () => {
    if (newVehicle.brand && newVehicle.model) {
      const vehicle: Vehicle = {
        id: Date.now().toString(),
        ...newVehicle,
      };
      setVehicles([...vehicles, vehicle]);
      setNewVehicle({
        brand: '',
        model: '',
        year: '',
        batteryCapacity: '',
        maxChargingSpeed: '',
      });
      setIsAddDialogOpen(false);
    }
  };

  const handleRemoveVehicle = (id: string) => {
    setVehicles(vehicles.filter((v) => v.id !== id));
  };

  const handleUpdateVehicle = (id: string, updatedVehicle: Vehicle) => {
    setVehicles(vehicles.map((v) => (v.id === id ? updatedVehicle : v)));
    setEditingId(null);
  };

  return (
    <div className="flex h-screen w-full">
      {/* Main Content Area - 3/4 of screen */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-4xl mx-auto p-6 sm:p-8 lg:p-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl text-gray-900 mb-2">Vehicles</h1>
              <p className="text-sm text-gray-500">Manage your electric vehicles</p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </div>

          {vehicles.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-4">No vehicles added yet</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Vehicle
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  isEditing={editingId === vehicle.id}
                  onEdit={() => setEditingId(vehicle.id)}
                  onCancel={() => setEditingId(null)}
                  onSave={(updated) => handleUpdateVehicle(vehicle.id, updated)}
                  onRemove={() => handleRemoveVehicle(vehicle.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Side Menu - 1/4 of screen */}
      <div className="w-full sm:w-80 lg:w-96 flex-shrink-0">
        <SideMenu />
      </div>

      {/* Add Vehicle Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Enter the details of your electric vehicle
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={newVehicle.brand}
                onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                placeholder="e.g., Tesla, Chevrolet"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                placeholder="e.g., Model 3, Bolt EV"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                value={newVehicle.year}
                onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                placeholder="e.g., 2023"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="batteryCapacity">Battery Capacity (kWh)</Label>
              <Input
                id="batteryCapacity"
                value={newVehicle.batteryCapacity}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, batteryCapacity: e.target.value })
                }
                placeholder="e.g., 75"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="maxChargingSpeed">Max Charging Speed (kW)</Label>
              <Input
                id="maxChargingSpeed"
                value={newVehicle.maxChargingSpeed}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, maxChargingSpeed: e.target.value })
                }
                placeholder="e.g., 250"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVehicle}>Add Vehicle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface VehicleCardProps {
  vehicle: Vehicle;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (vehicle: Vehicle) => void;
  onRemove: () => void;
}

function VehicleCard({
  vehicle,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onRemove,
}: VehicleCardProps) {
  const [editedVehicle, setEditedVehicle] = useState(vehicle);

  const handleSave = () => {
    onSave(editedVehicle);
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`edit-brand-${vehicle.id}`}>Brand</Label>
            <Input
              id={`edit-brand-${vehicle.id}`}
              value={editedVehicle.brand}
              onChange={(e) => setEditedVehicle({ ...editedVehicle, brand: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor={`edit-model-${vehicle.id}`}>Model</Label>
            <Input
              id={`edit-model-${vehicle.id}`}
              value={editedVehicle.model}
              onChange={(e) => setEditedVehicle({ ...editedVehicle, model: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor={`edit-year-${vehicle.id}`}>Year</Label>
            <Input
              id={`edit-year-${vehicle.id}`}
              value={editedVehicle.year}
              onChange={(e) => setEditedVehicle({ ...editedVehicle, year: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor={`edit-battery-${vehicle.id}`}>Battery Capacity (kWh)</Label>
            <Input
              id={`edit-battery-${vehicle.id}`}
              value={editedVehicle.batteryCapacity}
              onChange={(e) =>
                setEditedVehicle({ ...editedVehicle, batteryCapacity: e.target.value })
              }
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor={`edit-charging-${vehicle.id}`}>Max Charging Speed (kW)</Label>
            <Input
              id={`edit-charging-${vehicle.id}`}
              value={editedVehicle.maxChargingSpeed}
              onChange={(e) =>
                setEditedVehicle({ ...editedVehicle, maxChargingSpeed: e.target.value })
              }
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleSave} size="sm">
            <Check className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button onClick={onCancel} variant="outline" size="sm">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {vehicle.brand} {vehicle.model}
          </h3>
          {vehicle.year && <p className="text-sm text-gray-500">{vehicle.year}</p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button onClick={onRemove} variant="outline" size="sm">
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Battery Capacity</p>
          <p className="text-sm text-gray-900">{vehicle.batteryCapacity || 'N/A'} kWh</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Max Charging Speed</p>
          <p className="text-sm text-gray-900">{vehicle.maxChargingSpeed || 'N/A'} kW</p>
        </div>
      </div>
    </div>
  );
}
