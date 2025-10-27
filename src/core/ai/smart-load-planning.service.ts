import { Injectable, Logger } from '@nestjs/common';

interface Package {
  id: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  stackable: boolean;
  fragile: boolean;
  rotation: boolean; // Allow rotation
  priority?: number;
}

interface Container {
  id: string;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  type: string;
}

interface LoadPlan {
  container: Container;
  packages: Array<{
    package: Package;
    position: {
      x: number;
      y: number;
      z: number;
    };
    orientation: 'original' | 'rotated_90' | 'rotated_180' | 'rotated_270';
  }>;
  utilization: {
    volumeUtilization: number;
    weightUtilization: number;
    efficiency: number;
  };
  warnings: string[];
}

@Injectable()
export class SmartLoadPlanningService {
  private readonly logger = new Logger(SmartLoadPlanningService.name);

  async optimizeLoadPlan(
    packages: Package[],
    containers: Container[],
  ): Promise<LoadPlan[]> {
    const loadPlans: LoadPlan[] = [];

    // Sort packages by volume (largest first) for better packing
    const sortedPackages = [...packages].sort((a, b) => {
      const volA = a.length * a.width * a.height;
      const volB = b.length * b.width * b.height;
      return volB - volA;
    });

    // Sort containers by volume
    const sortedContainers = [...containers].sort((a, b) => {
      const volA = a.length * a.width * a.height;
      const volB = b.length * b.width * b.height;
      return volA - volB; // Start with smallest
    });

    let remainingPackages = [...sortedPackages];

    for (const container of sortedContainers) {
      if (remainingPackages.length === 0) break;

      const plan = this.packContainer(container, remainingPackages);
      
      if (plan.packages.length > 0) {
        loadPlans.push(plan);
        
        // Remove packed packages
        const packedIds = new Set(plan.packages.map(p => p.package.id));
        remainingPackages = remainingPackages.filter(p => !packedIds.has(p.id));
      }
    }

    return loadPlans;
  }

  private packContainer(container: Container, packages: Package[]): LoadPlan {
    const packed: LoadPlan['packages'] = [];
    const warnings: string[] = [];
    
    let currentWeight = 0;
    let currentZ = 0; // Height level

    for (const pkg of packages) {
      // Check weight constraint
      if (currentWeight + pkg.weight > container.maxWeight) {
        warnings.push(`Package ${pkg.id} exceeds weight limit`);
        continue;
      }

      // Try to find position using First Fit Decreasing
      const position = this.findBestPosition(pkg, container, packed);

      if (position) {
        packed.push({
          package: pkg,
          position: position.position,
          orientation: position.orientation,
        });
        currentWeight += pkg.weight;
      } else {
        warnings.push(`Package ${pkg.id} does not fit`);
      }
    }

    // Calculate utilization
    const containerVolume = container.length * container.width * container.height;
    const packedVolume = packed.reduce((sum, item) => {
      const pkg = item.package;
      return sum + (pkg.length * pkg.width * pkg.height);
    }, 0);

    const volumeUtilization = (packedVolume / containerVolume) * 100;
    const weightUtilization = (currentWeight / container.maxWeight) * 100;
    const efficiency = (volumeUtilization + weightUtilization) / 2;

    return {
      container,
      packages: packed,
      utilization: {
        volumeUtilization: Math.round(volumeUtilization * 100) / 100,
        weightUtilization: Math.round(weightUtilization * 100) / 100,
        efficiency: Math.round(efficiency * 100) / 100,
      },
      warnings,
    };
  }

  private findBestPosition(
    pkg: Package,
    container: Container,
    packed: LoadPlan['packages'][],
  ): { position: { x: number; y: number; z: number }; orientation: string } | null {
    const orientations = this.getValidOrientations(pkg);

    for (const orientation of orientations) {
      const dims = this.getOrientedDimensions(pkg, orientation);

      // Try to place at bottom first (z=0)
      for (let x = 0; x <= container.length - dims.length; x += 10) {
        for (let y = 0; y <= container.width - dims.width; y += 10) {
          for (let z = 0; z <= container.height - dims.height; z += 10) {
            const position = { x, y, z };

            if (this.isPositionValid(position, dims, container, packed, pkg)) {
              return { position, orientation };
            }
          }
        }
      }
    }

    return null;
  }

  private getValidOrientations(pkg: Package): string[] {
    const orientations = ['original'];
    
    if (pkg.rotation) {
      orientations.push('rotated_90', 'rotated_180', 'rotated_270');
    }

    return orientations;
  }

  private getOrientedDimensions(pkg: Package, orientation: string): { length: number; width: number; height: number } {
    switch (orientation) {
      case 'rotated_90':
        return { length: pkg.width, width: pkg.length, height: pkg.height };
      case 'rotated_180':
        return { length: pkg.length, width: pkg.width, height: pkg.height };
      case 'rotated_270':
        return { length: pkg.width, width: pkg.length, height: pkg.height };
      default:
        return { length: pkg.length, width: pkg.width, height: pkg.height };
    }
  }

  private isPositionValid(
    position: { x: number; y: number; z: number },
    dims: { length: number; width: number; height: number },
    container: Container,
    packed: LoadPlan['packages'][],
    pkg: Package,
  ): boolean {
    // Check container boundaries
    if (
      position.x + dims.length > container.length ||
      position.y + dims.width > container.width ||
      position.z + dims.height > container.height
    ) {
      return false;
    }

    // Check collisions with packed items
    for (const item of packed) {
      if (this.checkCollision(position, dims, item.position, this.getOrientedDimensions(item.package, item.orientation))) {
        return false;
      }

      // Check stacking rules
      if (position.z > 0 && !item.package.stackable && this.isAbove(position, item.position)) {
        return false;
      }

      // Fragile items can't have items on top
      if (pkg.fragile && item.position.z > position.z && this.isAbove(item.position, position)) {
        return false;
      }
    }

    return true;
  }

  private checkCollision(
    pos1: { x: number; y: number; z: number },
    dims1: { length: number; width: number; height: number },
    pos2: { x: number; y: number; z: number },
    dims2: { length: number; width: number; height: number },
  ): boolean {
    return !(
      pos1.x + dims1.length <= pos2.x ||
      pos2.x + dims2.length <= pos1.x ||
      pos1.y + dims1.width <= pos2.y ||
      pos2.y + dims2.width <= pos1.y ||
      pos1.z + dims1.height <= pos2.z ||
      pos2.z + dims2.height <= pos1.z
    );
  }

  private isAbove(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number },
  ): boolean {
    return pos1.z > pos2.z;
  }

  async suggestContainerType(packages: Package[]): Promise<{
    suggestedContainer: string;
    reason: string;
    alternatives: string[];
  }> {
    const totalVolume = packages.reduce((sum, pkg) => 
      sum + (pkg.length * pkg.width * pkg.height), 0
    );

    const totalWeight = packages.reduce((sum, pkg) => sum + pkg.weight, 0);

    const hasFragile = packages.some(pkg => pkg.fragile);
    const hasLarge = packages.some(pkg => 
      pkg.length > 120 || pkg.width > 100 || pkg.height > 100
    );

    let suggested = '20ft Container';
    let reason = 'Standard container for general cargo';
    const alternatives: string[] = [];

    if (totalVolume < 15000 && totalWeight < 5000) {
      suggested = 'Pallet';
      reason = 'Small volume, suitable for pallet shipping';
      alternatives.push('Small Van', 'Parcel');
    } else if (totalVolume < 30000 && totalWeight < 15000) {
      suggested = '20ft Container';
      reason = 'Medium volume cargo';
      alternatives.push('40ft Container', 'Truck');
    } else {
      suggested = '40ft Container';
      reason = 'Large volume cargo';
      alternatives.push('40ft HC Container', 'Multiple 20ft');
    }

    if (hasFragile) {
      reason += ' with special handling for fragile items';
    }

    return {
      suggestedContainer: suggested,
      reason,
      alternatives,
    };
  }
}


