import React, { useState } from 'react';
import { Card, Input, Button } from '@ayazlogistics/design-system';

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingData, setTrackingData] = useState<any>(null);

  const handleTrack = async () => {
    // Mock tracking data
    setTrackingData({
      trackingNumber,
      status: 'In Transit',
      currentLocation: 'Istanbul Distribution Center',
      estimatedDelivery: '2025-10-26',
      events: [
        { date: '2025-10-24 09:00', location: 'Ankara', status: 'Picked up', icon: '📦' },
        { date: '2025-10-24 14:30', location: 'Eskişehir', status: 'In transit', icon: '🚚' },
        { date: '2025-10-24 20:15', location: 'Istanbul DC', status: 'Arrived at facility', icon: '🏢' },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Track Your Shipment</h1>

        <Card className="mb-8">
          <div className="flex space-x-4">
            <Input
              placeholder="Enter tracking number (e.g., TRACK-20251024-123456)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              fullWidth
            />
            <Button onClick={handleTrack}>Track</Button>
          </div>
        </Card>

        {trackingData && (
          <>
            <Card title="Shipment Status" className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoItem label="Status" value={trackingData.status} color="blue" />
                <InfoItem label="Current Location" value={trackingData.currentLocation} />
                <InfoItem label="Est. Delivery" value={trackingData.estimatedDelivery} color="green" />
              </div>
            </Card>

            <Card title="Tracking History">
              <div className="space-y-4">
                {trackingData.events.map((event: any, idx: number) => (
                  <div key={idx} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                      {event.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{event.status}</p>
                      <p className="text-sm text-gray-500">{event.location}</p>
                      <p className="text-xs text-gray-400 mt-1">{event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value, color = 'gray' }: any) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    gray: 'text-gray-900',
  };

  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}

