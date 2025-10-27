import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface WarehouseData {
  zones: Array<{
    id: string;
    name: string;
    code: string;
    capacity: number;
    currentUtilization: number;
    temperature?: { min: number; max: number };
  }>;
  locations: Array<{
    id: string;
    zoneId: string;
    code: string;
    aisle: string;
    rack: string;
    shelf: string;
    capacity: number;
    currentQuantity: number;
    isActive: boolean;
  }>;
  inventory: Array<{
    id: string;
    productId: string;
    locationId: string;
    quantity: number;
    status: 'available' | 'reserved' | 'damaged';
  }>;
}

export default function WarehouseVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [warehouseData, setWarehouseData] = useState<WarehouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch warehouse data from API
  const fetchWarehouseData = async (): Promise<WarehouseData> => {
    try {
      const response = await fetch('/api/warehouse/data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch warehouse data');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching warehouse data:', error);
      // Return empty structure on error - no mock data
      throw error;
    }
  };

  useEffect(() => {
    const loadWarehouseData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchWarehouseData();
        setWarehouseData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load warehouse data. Please try again later.');
        setWarehouseData(null);
        console.error('Warehouse data loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWarehouseData();
  }, []);

  useEffect(() => {
    if (!containerRef.current || loading || !warehouseData) return;
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(30, 30, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Create floor based on warehouse zones
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Create 3D zones
    const zoneGeometry = new THREE.BoxGeometry(10, 2, 10);
    const zoneColors = {
      'REC-001': 0x4CAF50, // Green for receiving
      'STR-001': 0x2196F3, // Blue for storage
      'PICK-001': 0xFF9800, // Orange for picking
    };

    warehouseData.zones.forEach((zone, index) => {
      const zoneMaterial = new THREE.MeshStandardMaterial({
        color: zoneColors[zone.code as keyof typeof zoneColors] || 0x9E9E9E
      });
      const zoneMesh = new THREE.Mesh(zoneGeometry, zoneMaterial);

      // Position zones in a grid layout
      const x = (index % 3) * 15 - 15;
      const z = Math.floor(index / 3) * 15 - 7.5;
      zoneMesh.position.set(x, 1, z);

      // Add zone label
      const zoneLabel = createTextSprite(zone.name);
      zoneLabel.position.set(x, 3, z);
      scene.add(zoneLabel);

      scene.add(zoneMesh);
    });

    // Create 3D locations/racks
    const rackGeometry = new THREE.BoxGeometry(1, 3, 0.5);
    const rackMaterials = {
      available: new THREE.MeshStandardMaterial({ color: 0x4CAF50 }),
      reserved: new THREE.MeshStandardMaterial({ color: 0xFF9800 }),
      damaged: new THREE.MeshStandardMaterial({ color: 0xF44336 }),
    };

    warehouseData.locations.forEach((location, index) => {
      const inventoryItem = warehouseData.inventory.find(inv => inv.locationId === location.id);
      const utilization = location.currentQuantity / location.capacity;

      let rackColor = 0x9E9E9E; // Default gray
      if (inventoryItem) {
        switch (inventoryItem.status) {
          case 'available':
            rackColor = 0x4CAF50;
            break;
          case 'reserved':
            rackColor = 0xFF9800;
            break;
          case 'damaged':
            rackColor = 0xF44336;
            break;
        }
      }

      const rackMaterial = new THREE.MeshStandardMaterial({
        color: rackColor,
        transparent: true,
        opacity: 0.3 + (utilization * 0.7) // More opaque when more full
      });
      const rack = new THREE.Mesh(rackGeometry, rackMaterial);

      // Position racks based on aisle/rack/shelf
      const x = parseInt(location.aisle.charCodeAt(0).toString()) * 3 - 20;
      const z = parseInt(location.rack) * 2 - 10;
      const y = parseInt(location.shelf) * 1.5;

      rack.position.set(x, y, z);

      // Add location label
      const locationLabel = createTextSprite(`${location.code}\n${location.currentQuantity}/${location.capacity}`);
      locationLabel.position.set(x, y + 2, z);
      scene.add(locationLabel);

      scene.add(rack);
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [warehouseData, loading]);

  // Helper function to create text sprites
  const createTextSprite = (text: string): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 128;

    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'Bold 20px Arial';
    context.fillStyle = 'rgba(0, 0, 0, 1)';
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.scale.set(5, 2.5, 1);

    return sprite;
  };

  if (loading) {
    return (
      <div style={{ width: '100%', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p>Loading warehouse data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100%', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'red' }}>
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '16px', padding: '8px 16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Warehouse Statistics Overlay */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '200px'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Warehouse Stats</h3>
        {warehouseData && (
          <div style={{ fontSize: '14px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Total Capacity:</strong> {warehouseData.locations.reduce((sum, loc) => sum + loc.capacity, 0)}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Current Stock:</strong> {warehouseData.locations.reduce((sum, loc) => sum + loc.currentQuantity, 0)}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Utilization:</strong> {Math.round((warehouseData.locations.reduce((sum, loc) => sum + loc.currentQuantity, 0) / warehouseData.locations.reduce((sum, loc) => sum + loc.capacity, 0)) * 100)}%
            </div>
            <div>
              <strong>Active Zones:</strong> {warehouseData.zones.length}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

