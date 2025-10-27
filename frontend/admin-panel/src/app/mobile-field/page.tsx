'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Table } from '@/components/design-system/Table';
import { Modal } from '@/components/design-system/Modal';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';

interface OfflineOperation {
  id: string;
  driverId: string;
  operationType: 'pickup' | 'delivery' | 'inventory' | 'maintenance';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'synced';
  data: Record<string, any>;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
  offlineSince: string;
  syncedAt?: string;
}

interface ProofOfDelivery {
  id: string;
  shipmentId: string;
  driverId: string;
  deliveryType: 'signature' | 'photo' | 'code' | 'id_verification';
  recipientInfo: {
    name: string;
    idNumber?: string;
    phone?: string;
    email?: string;
  };
  deliveryData: {
    signature?: string;
    photo?: string;
    code?: string;
    idVerified?: boolean;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string;
  };
  isOffline: boolean;
  syncedAt?: string;
}

interface Geofence {
  id: string;
  name: string;
  description: string;
  type: 'warehouse' | 'delivery_zone' | 'restricted_area' | 'pickup_zone';
  coordinates: Array<{ latitude: number; longitude: number }>;
  radius?: number;
  isActive: boolean;
  rules: Array<{
    trigger: 'enter' | 'exit' | 'dwell';
    action: 'notify' | 'log' | 'restrict' | 'allow';
    conditions: string[];
    isActive: boolean;
  }>;
}

interface GeofenceEvent {
  id: string;
  geofenceId: string;
  driverId: string;
  vehicleId?: string;
  eventType: 'enter' | 'exit' | 'dwell';
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  duration?: number;
  isProcessed: boolean;
}

export default function MobileFieldPage() {
  const [offlineOperations, setOfflineOperations] = useState<OfflineOperation[]>([]);
  const [proofsOfDelivery, setProofsOfDelivery] = useState<ProofOfDelivery[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [geofenceEvents, setGeofenceEvents] = useState<GeofenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [showPodModal, setShowPodModal] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch offline operations
      const operationsResponse = await fetch('/api/v1/mobile/field-operations/offline-operations');
      const operationsData = await operationsResponse.json();
      setOfflineOperations(operationsData);

      // Fetch proofs of delivery
      const podResponse = await fetch('/api/v1/mobile/field-operations/proof-of-delivery');
      const podData = await podResponse.json();
      setProofsOfDelivery(podData);

      // Fetch geofences
      const geofencesResponse = await fetch('/api/v1/mobile/field-operations/geofences');
      const geofencesData = await geofencesResponse.json();
      setGeofences(geofencesData);

      // Fetch geofence events
      const eventsResponse = await fetch('/api/v1/mobile/field-operations/geofence-events');
      const eventsData = await eventsResponse.json();
      setGeofenceEvents(eventsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      failed: 'error',
      synced: 'success',
      enter: 'success',
      exit: 'warning',
      dwell: 'info'
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      pickup: 'blue',
      delivery: 'green',
      inventory: 'purple',
      maintenance: 'orange',
      signature: 'green',
      photo: 'blue',
      code: 'purple',
      id_verification: 'red',
      warehouse: 'blue',
      delivery_zone: 'green',
      restricted_area: 'red',
      pickup_zone: 'orange'
    } as const;

    return <Badge variant={variants[type as keyof typeof variants] || 'default'}>{type}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Mobile Field Operations</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setShowOperationModal(true)}>Create Operation</Button>
          <Button onClick={() => setShowPodModal(true)}>Create PoD</Button>
          <Button onClick={() => setShowGeofenceModal(true)}>Create Geofence</Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Offline Operations</p>
                <p className="text-2xl font-bold text-gray-900">{offlineOperations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Proofs of Delivery</p>
                <p className="text-2xl font-bold text-gray-900">{proofsOfDelivery.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Geofences</p>
                <p className="text-2xl font-bold text-gray-900">
                  {geofences.filter(g => g.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Geofence Events</p>
                <p className="text-2xl font-bold text-gray-900">{geofenceEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Offline Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Type</th>
                <th>Status</th>
                <th>Location</th>
                <th>Offline Since</th>
                <th>Synced</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offlineOperations.map((operation) => (
                <tr key={operation.id}>
                  <td className="font-medium">{operation.driverId}</td>
                  <td>{getTypeBadge(operation.operationType)}</td>
                  <td>{getStatusBadge(operation.status)}</td>
                  <td>
                    <span className="text-sm">
                      {operation.location.latitude.toFixed(4)}, {operation.location.longitude.toFixed(4)}
                    </span>
                  </td>
                  <td>{new Date(operation.offlineSince).toLocaleString()}</td>
                  <td>
                    {operation.syncedAt ? (
                      <span className="text-green-600">✓ Synced</span>
                    ) : (
                      <span className="text-orange-600">⏳ Pending</span>
                    )}
                  </td>
                  <td>
                    <Button variant="outline" size="sm">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Proofs of Delivery */}
      <Card>
        <CardHeader>
          <CardTitle>Proofs of Delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Shipment</th>
                <th>Driver</th>
                <th>Type</th>
                <th>Recipient</th>
                <th>Location</th>
                <th>Offline</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {proofsOfDelivery.map((pod) => (
                <tr key={pod.id}>
                  <td className="font-medium">{pod.shipmentId}</td>
                  <td>{pod.driverId}</td>
                  <td>{getTypeBadge(pod.deliveryType)}</td>
                  <td>{pod.recipientInfo.name}</td>
                  <td>
                    <span className="text-sm">
                      {pod.location.latitude.toFixed(4)}, {pod.location.longitude.toFixed(4)}
                    </span>
                  </td>
                  <td>
                    {pod.isOffline ? (
                      <Badge variant="warning">Offline</Badge>
                    ) : (
                      <Badge variant="success">Online</Badge>
                    )}
                  </td>
                  <td>
                    <Button variant="outline" size="sm">View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Geofences */}
      <Card>
        <CardHeader>
          <CardTitle>Geofences</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Coordinates</th>
                <th>Radius</th>
                <th>Rules</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {geofences.map((geofence) => (
                <tr key={geofence.id}>
                  <td className="font-medium">{geofence.name}</td>
                  <td>{getTypeBadge(geofence.type)}</td>
                  <td>
                    <span className="text-sm">
                      {geofence.coordinates.length} points
                    </span>
                  </td>
                  <td>{geofence.radius ? `${geofence.radius}m` : 'N/A'}</td>
                  <td>{geofence.rules.length}</td>
                  <td>
                    <Badge variant={geofence.isActive ? 'success' : 'default'}>
                      {geofence.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <Button variant="outline" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Geofence Events */}
      <Card>
        <CardHeader>
          <CardTitle>Geofence Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Geofence</th>
                <th>Driver</th>
                <th>Event Type</th>
                <th>Location</th>
                <th>Duration</th>
                <th>Processed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {geofenceEvents.map((event) => (
                <tr key={event.id}>
                  <td className="font-medium">{event.geofenceId}</td>
                  <td>{event.driverId}</td>
                  <td>{getStatusBadge(event.eventType)}</td>
                  <td>
                    <span className="text-sm">
                      {event.location.latitude.toFixed(4)}, {event.location.longitude.toFixed(4)}
                    </span>
                  </td>
                  <td>{event.duration ? `${event.duration}s` : 'N/A'}</td>
                  <td>
                    <Badge variant={event.isProcessed ? 'success' : 'warning'}>
                      {event.isProcessed ? 'Processed' : 'Pending'}
                    </Badge>
                  </td>
                  <td>
                    <Button variant="outline" size="sm">Process</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <Modal isOpen={showOperationModal} onClose={() => setShowOperationModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create Offline Operation</h2>
          <form className="space-y-4">
            <Input label="Driver ID" placeholder="DRIVER-123" />
            <Select label="Operation Type" options={[
              { value: 'pickup', label: 'Pickup' },
              { value: 'delivery', label: 'Delivery' },
              { value: 'inventory', label: 'Inventory' },
              { value: 'maintenance', label: 'Maintenance' }
            ]} />
            <Input label="Latitude" type="number" placeholder="41.0082" />
            <Input label="Longitude" type="number" placeholder="28.9784" />
            <Input label="Accuracy" type="number" placeholder="5.0" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowOperationModal(false)}>Cancel</Button>
              <Button>Create Operation</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showPodModal} onClose={() => setShowPodModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create Proof of Delivery</h2>
          <form className="space-y-4">
            <Input label="Shipment ID" placeholder="SHIP-123" />
            <Input label="Driver ID" placeholder="DRIVER-123" />
            <Select label="Delivery Type" options={[
              { value: 'signature', label: 'Signature' },
              { value: 'photo', label: 'Photo' },
              { value: 'code', label: 'Code' },
              { value: 'id_verification', label: 'ID Verification' }
            ]} />
            <Input label="Recipient Name" placeholder="John Doe" />
            <Input label="Latitude" type="number" placeholder="41.0082" />
            <Input label="Longitude" type="number" placeholder="28.9784" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPodModal(false)}>Cancel</Button>
              <Button>Create PoD</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showGeofenceModal} onClose={() => setShowGeofenceModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create Geofence</h2>
          <form className="space-y-4">
            <Input label="Name" placeholder="Warehouse Zone A" />
            <Input label="Description" placeholder="Main warehouse delivery zone" />
            <Select label="Type" options={[
              { value: 'warehouse', label: 'Warehouse' },
              { value: 'delivery_zone', label: 'Delivery Zone' },
              { value: 'restricted_area', label: 'Restricted Area' },
              { value: 'pickup_zone', label: 'Pickup Zone' }
            ]} />
            <Input label="Radius (meters)" type="number" placeholder="100" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowGeofenceModal(false)}>Cancel</Button>
              <Button>Create Geofence</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
