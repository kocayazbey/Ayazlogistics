import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

interface LocationUpdate {
  id: string;
  plateNumber: string;
  latitude: number;
  longitude: number;
  status: string;
  timestamp: number;
  speed?: number;
  heading?: number;
}

interface MapViewProps {
  vehicles: Array<{
    id: string;
    plateNumber: string;
    latitude: number;
    longitude: number;
    status: string;
  }>;
  center?: { lat: number; lng: number };
  zoom?: number;
  animateUpdates?: boolean;
  showTrails?: boolean;
  trailLength?: number;
}

export const MapView: React.FC<MapViewProps> = ({
  vehicles,
  center = { lat: 41.0082, lng: 28.9784 },
  zoom = 11,
  animateUpdates = true,
  showTrails = true,
  trailLength = 50,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const trailsRef = useRef<Map<string, any>>(new Map());
  const animationsRef = useRef<Map<string, any>>(new Map());
  const [locationHistory, setLocationHistory] = useState<Map<string, LocationUpdate[]>>(new Map());

  useEffect(() => {
    if (!mapRef.current) return;

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
        {
          featureType: 'transit',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    updateMarkers();
  }, []);

  useEffect(() => {
    updateMarkers();
  }, [vehicles]);

  const updateMarkers = () => {
    if (!googleMapRef.current) return;

    // Clear existing markers and trails
    markersRef.current.forEach(marker => marker.setMap(null));
    trailsRef.current.forEach(trail => trail.setMap(null));
    markersRef.current = [];
    trailsRef.current.clear();

    vehicles.forEach(vehicle => {
      // Create animated marker
      const marker = createAnimatedMarker(vehicle);

      // Create info window with enhanced content
      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(vehicle),
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current, marker);
      });

      // Add right-click listener for trail toggle
      marker.addListener('rightclick', () => {
        toggleTrail(vehicle.id);
      });

      markersRef.current.push(marker);

      // Create trail if enabled
      if (showTrails) {
        createTrail(vehicle);
      }
    });
  };

  const createAnimatedMarker = (vehicle: any) => {
    const marker = new window.google.maps.Marker({
      position: { lat: vehicle.latitude, lng: vehicle.longitude },
      map: googleMapRef.current,
      title: vehicle.plateNumber,
      icon: {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: getVehicleColor(vehicle.status),
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        rotation: vehicle.heading || 0,
      },
      optimized: false, // Required for smooth animation
    });

    // Store current position for animation
    marker.currentPosition = { lat: vehicle.latitude, lng: vehicle.longitude };
    marker.targetPosition = { lat: vehicle.latitude, lng: vehicle.longitude };

    // Animate marker movement
    if (animateUpdates) {
      animateMarker(marker, vehicle);
    }

    return marker;
  };

  const animateMarker = (marker: any, vehicle: any) => {
    if (!animateUpdates) return;

    const animationKey = vehicle.id;
    const existingAnimation = animationsRef.current.get(animationKey);

    if (existingAnimation) {
      cancelAnimationFrame(existingAnimation);
    }

    const animate = () => {
      const current = marker.currentPosition;
      const target = marker.targetPosition;

      // Check if we need to move
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(current.lat, current.lng),
        new google.maps.LatLng(target.lat, target.lng)
      );

      if (distance > 1) { // If more than 1 meter away, animate
        const step = 0.02; // Animation smoothness (lower = smoother)
        const deltaLat = (target.lat - current.lat) * step;
        const deltaLng = (target.lng - current.lng) * step;

        marker.currentPosition.lat += deltaLat;
        marker.currentPosition.lng += deltaLng;

        marker.setPosition(marker.currentPosition);

        // Update rotation based on movement direction
        const heading = Math.atan2(deltaLat, deltaLng) * 180 / Math.PI;
        marker.setIcon({
          ...marker.getIcon(),
          rotation: heading,
        });

        animationsRef.current.set(animationKey, requestAnimationFrame(animate));
      } else {
        // Animation complete
        marker.currentPosition = { ...target };
        animationsRef.current.delete(animationKey);
      }
    };

    // Start animation
    marker.targetPosition = { lat: vehicle.latitude, lng: vehicle.longitude };
    animationsRef.current.set(animationKey, requestAnimationFrame(animate));
  };

  const createTrail = (vehicle: any) => {
    const vehicleHistory = locationHistory.get(vehicle.id) || [];
    const trailCoordinates = vehicleHistory.slice(-trailLength).map(update => ({
      lat: update.latitude,
      lng: update.longitude,
    }));

    if (trailCoordinates.length > 1) {
      const trail = new window.google.maps.Polyline({
        path: trailCoordinates,
        geodesic: true,
        strokeColor: getTrailColor(vehicle.status),
        strokeOpacity: 0.7,
        strokeWeight: 3,
        map: googleMapRef.current,
      });

      trailsRef.current.set(vehicle.id, trail);
    }
  };

  const updateVehiclePosition = (vehicleId: string, newPosition: { lat: number; lng: number }, speed?: number, heading?: number) => {
    const marker = markersRef.current.find(m => m.title === vehicleId);
    if (marker) {
      marker.targetPosition = { lat: newPosition.lat, lng: newPosition.lng };

      // Update location history
      setLocationHistory(prev => {
        const history = prev.get(vehicleId) || [];
        const newUpdate: LocationUpdate = {
          id: vehicleId,
          plateNumber: marker.title,
          latitude: newPosition.lat,
          longitude: newPosition.lng,
          status: 'active',
          timestamp: Date.now(),
          speed,
          heading,
        };

        const updatedHistory = [...history, newUpdate].slice(-trailLength);
        prev.set(vehicleId, updatedHistory);
        return new Map(prev);
      });

      // Restart animation
      animateMarker(marker, { ...newPosition, heading });
    }
  };

  const toggleTrail = (vehicleId: string) => {
    const trail = trailsRef.current.get(vehicleId);
    if (trail) {
      trail.setMap(trail.getMap() ? null : googleMapRef.current);
    }
  };

  const getVehicleColor = (status: string): string => {
    switch (status) {
      case 'active': return '#34C759';
      case 'idle': return '#FF9500';
      case 'offline': return '#8E8E93';
      case 'emergency': return '#FF3B30';
      default: return '#007AFF';
    }
  };

  const getTrailColor = (status: string): string => {
    switch (status) {
      case 'active': return '#34C759';
      case 'idle': return '#FF9500';
      case 'offline': return '#8E8E93';
      case 'emergency': return '#FF3B30';
      default: return '#007AFF';
    }
  };

  const createInfoWindowContent = (vehicle: any): string => {
    const history = locationHistory.get(vehicle.id) || [];
    const lastUpdate = history[history.length - 1];

    return `
      <div style="padding: 12px; min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="width: 12px; height: 12px; background: ${getVehicleColor(vehicle.status)}; border-radius: 50%; margin-right: 8px;"></div>
          <strong style="font-size: 16px;">${vehicle.plateNumber}</strong>
        </div>
        <div style="margin-bottom: 4px;"><strong>Status:</strong> ${vehicle.status}</div>
        <div style="margin-bottom: 4px;"><strong>Position:</strong> ${vehicle.latitude.toFixed(6)}, ${vehicle.longitude.toFixed(6)}</div>
        ${lastUpdate?.speed ? `<div style="margin-bottom: 4px;"><strong>Speed:</strong> ${lastUpdate.speed.toFixed(1)} km/h</div>` : ''}
        ${lastUpdate?.heading ? `<div style="margin-bottom: 4px;"><strong>Heading:</strong> ${lastUpdate.heading.toFixed(1)}°</div>` : ''}
        ${lastUpdate?.timestamp ? `<div style="margin-bottom: 4px; font-size: 12px; color: #666;"><strong>Last Update:</strong> ${new Date(lastUpdate.timestamp).toLocaleTimeString()}</div>` : ''}
        ${showTrails ? '<div style="margin-top: 8px; font-size: 12px; color: #666;">Right-click to toggle trail</div>' : ''}
      </div>
    `;
  };

  // Expose methods for external control
  useEffect(() => {
    if (googleMapRef.current) {
      (window as any).mapInstance = {
        updateVehiclePosition,
        toggleTrail,
        getLocationHistory: () => locationHistory,
        clearTrails: () => {
          trailsRef.current.forEach(trail => trail.setMap(null));
          trailsRef.current.clear();
        },
        showAllTrails: () => {
          trailsRef.current.forEach(trail => trail.setMap(googleMapRef.current));
        },
        hideAllTrails: () => {
          trailsRef.current.forEach(trail => trail.setMap(null));
        },
      };
    }
  }, [locationHistory, showTrails]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '600px', borderRadius: '12px' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Animation controls */}
      {animateUpdates && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'white',
          padding: '8px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          fontSize: '12px',
          color: '#666',
        }}>
          Live Animation Active
        </div>
      )}

      {/* Trail legend */}
      {showTrails && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'white',
          padding: '8px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          fontSize: '12px',
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>Trail Colors:</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '3px', background: '#34C759' }}></div>
            <span>Active</span>
            <div style={{ width: '12px', height: '3px', background: '#FF9500', marginLeft: '8px' }}></div>
            <span>Idle</span>
          </div>
        </div>
      )}
    </div>
  );
};

