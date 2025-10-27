import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface PortSchedule {
  portCode: string;
  portName: string;
  vesselName: string;
  vesselIMO: string;
  eta: Date;
  etd: Date;
  berthNumber: string;
  status: 'scheduled' | 'arrived' | 'berthed' | 'departed';
  cargoType: string;
  serviceType: 'loading' | 'unloading' | 'both';
}

interface ContainerTracking {
  containerNumber: string;
  portCode: string;
  location: string;
  status: 'in_transit' | 'at_port' | 'customs' | 'ready_for_pickup' | 'released';
  arrivalDate: Date;
  availabilityDate?: Date;
  holds: string[];
  charges: Array<{
    type: string;
    amount: number;
    currency: string;
  }>;
}

interface PortSlotBooking {
  bookingId: string;
  portCode: string;
  requestedDate: Date;
  allocatedSlot?: Date;
  duration: number;
  serviceType: string;
  vesselDetails: {
    name: string;
    imo: string;
    length: number;
    draft: number;
  };
  status: 'pending' | 'confirmed' | 'cancelled';
}

@Injectable()
export class PortManagementService {
  private readonly logger = new Logger(PortManagementService.name);
  private readonly apiUrl = process.env.PORT_API_URL || 'https://api.portnet.tr';
  private readonly apiKey = process.env.PORT_API_KEY;

  async getVesselSchedule(portCode: string, dateRange: { start: Date; end: Date }): Promise<PortSchedule[]> {
    this.logger.log(`Fetching vessel schedule for port: ${portCode}`);

    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/ports/${portCode}/schedule`,
        {
          params: {
            start_date: dateRange.start.toISOString(),
            end_date: dateRange.end.toISOString(),
          },
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return response.data.vessels.map((v: any) => ({
        portCode,
        portName: v.port_name,
        vesselName: v.vessel_name,
        vesselIMO: v.imo_number,
        eta: new Date(v.eta),
        etd: new Date(v.etd),
        berthNumber: v.berth,
        status: v.status,
        cargoType: v.cargo_type,
        serviceType: v.service_type,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch vessel schedule:', error);
      return [];
    }
  }

  async trackContainer(containerNumber: string): Promise<ContainerTracking | null> {
    this.logger.log(`Tracking container: ${containerNumber}`);

    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/containers/${containerNumber}`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return {
        containerNumber,
        portCode: response.data.current_port,
        location: response.data.current_location,
        status: response.data.status,
        arrivalDate: new Date(response.data.arrival_date),
        availabilityDate: response.data.available_for_pickup ? new Date(response.data.available_for_pickup) : undefined,
        holds: response.data.holds || [],
        charges: response.data.charges || [],
      };
    } catch (error) {
      this.logger.error('Container tracking failed:', error);
      return null;
    }
  }

  async bookBerthSlot(booking: Omit<PortSlotBooking, 'bookingId' | 'status'>): Promise<PortSlotBooking> {
    this.logger.log(`Booking berth slot at port: ${booking.portCode}`);

    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/ports/${booking.portCode}/berths/book`,
        {
          requested_date: booking.requestedDate.toISOString(),
          duration_hours: booking.duration,
          service_type: booking.serviceType,
          vessel: booking.vesselDetails,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        bookingId: response.data.booking_id,
        ...booking,
        allocatedSlot: response.data.allocated_slot ? new Date(response.data.allocated_slot) : undefined,
        status: response.data.status,
      };
    } catch (error) {
      this.logger.error('Berth booking failed:', error);
      throw error;
    }
  }

  async getPortCharges(portCode: string, serviceType: string, vesselSize: number): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/ports/${portCode}/charges`,
        {
          params: { service_type: serviceType, vessel_size: vesselSize },
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return {
        portDues: response.data.port_dues || 0,
        berthageFees: response.data.berthage || 0,
        pilotage: response.data.pilotage || 0,
        towage: response.data.towage || 0,
        totalEstimated: response.data.total || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get port charges:', error);
      return null;
    }
  }

  async submitCustomsClearance(portCode: string, containerNumber: string, documents: any[]): Promise<boolean> {
    try {
      await axios.post(
        `${this.apiUrl}/v1/ports/${portCode}/customs/submit`,
        {
          container_number: containerNumber,
          documents,
        },
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      this.logger.log(`Customs clearance submitted for container: ${containerNumber}`);
      return true;
    } catch (error) {
      this.logger.error('Customs submission failed:', error);
      return false;
    }
  }

  async getPortCapacity(portCode: string, date: Date): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/ports/${portCode}/capacity`,
        {
          params: { date: date.toISOString().split('T')[0] },
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return {
        totalBerths: response.data.total_berths,
        availableBerths: response.data.available_berths,
        utilization: response.data.utilization_percentage,
        nextAvailableSlot: response.data.next_available ? new Date(response.data.next_available) : null,
      };
    } catch (error) {
      this.logger.error('Failed to get port capacity:', error);
      return null;
    }
  }
}

