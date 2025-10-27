import { Injectable } from '@nestjs/common';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../../core/database/database.service';
import { invoices } from '../../../../database/schema/logistics/billing.schema';
import { routes, vehicles, drivers } from '../../../../database/schema/logistics/tms.schema';
import { customers, leads } from '../../../../database/schema/shared/crm.schema';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardKPIs(tenantId: string, startDate: Date, endDate: Date) {
    const [
      revenueData,
      shipmentsData,
      customersData,
      vehiclesData,
    ] = await Promise.all([
      this.getRevenueMetrics(tenantId, startDate, endDate),
      this.getShipmentsMetrics(tenantId, startDate, endDate),
      this.getCustomersMetrics(tenantId, startDate, endDate),
      this.getVehiclesMetrics(tenantId),
    ]);

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      financial: revenueData,
      operations: shipmentsData,
      customers: customersData,
      fleet: vehiclesData,
      timestamp: new Date(),
    };
  }

  async getRevenueMetrics(tenantId: string, startDate: Date, endDate: Date) {
    const allInvoices = await this.db.client
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          gte(invoices.invoiceDate, startDate.toISOString().split('T')[0]),
          lte(invoices.invoiceDate, endDate.toISOString().split('T')[0])
        )
      );

    const totalRevenue = allInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.totalAmount || '0'),
      0
    );

    const totalPaid = allInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.paidAmount || '0'),
      0
    );

    const outstanding = totalRevenue - totalPaid;

    const invoicesByStatus = {
      draft: allInvoices.filter(inv => inv.status === 'draft').length,
      sent: allInvoices.filter(inv => inv.status === 'sent').length,
      paid: allInvoices.filter(inv => inv.status === 'paid').length,
      overdue: allInvoices.filter(inv => {
        const dueDate = new Date(inv.dueDate);
        return inv.status !== 'paid' && dueDate < new Date();
      }).length,
    };

    return {
      totalRevenue,
      totalPaid,
      outstanding,
      outstandingPercentage: totalRevenue > 0 ? (outstanding / totalRevenue) * 100 : 0,
      invoiceCount: allInvoices.length,
      invoicesByStatus,
      averageInvoiceValue: allInvoices.length > 0 ? totalRevenue / allInvoices.length : 0,
    };
  }

  async getShipmentsMetrics(tenantId: string, startDate: Date, endDate: Date) {
    const allRoutes = await this.db.client
      .select()
      .from(routes)
      .where(
        and(
          eq(routes.tenantId, tenantId),
          gte(routes.routeDate, startDate.toISOString().split('T')[0]),
          lte(routes.routeDate, endDate.toISOString().split('T')[0])
        )
      );

    const completedRoutes = allRoutes.filter(r => r.status === 'completed');
    const totalDistance = completedRoutes.reduce(
      (sum, r) => sum + parseFloat(r.totalDistance || '0'),
      0
    );

    const totalStops = allRoutes.reduce(
      (sum, r) => sum + (r.totalStops || 0),
      0
    );

    const routesByStatus = {
      planned: allRoutes.filter(r => r.status === 'planned').length,
      inProgress: allRoutes.filter(r => r.status === 'in_progress').length,
      completed: completedRoutes.length,
      cancelled: allRoutes.filter(r => r.status === 'cancelled').length,
    };

    const onTimeDeliveryRate = completedRoutes.length > 0
      ? (completedRoutes.length / allRoutes.length) * 100
      : 0;

    return {
      totalShipments: allRoutes.length,
      completedShipments: completedRoutes.length,
      totalDistance,
      totalStops,
      routesByStatus,
      onTimeDeliveryRate,
      averageDistance: completedRoutes.length > 0 ? totalDistance / completedRoutes.length : 0,
    };
  }

  async getCustomersMetrics(tenantId: string, startDate: Date, endDate: Date) {
    const [allCustomers, allLeads, newCustomers] = await Promise.all([
      this.db.client
        .select()
        .from(customers)
        .where(eq(customers.tenantId, tenantId)),
      
      this.db.client
        .select()
        .from(leads)
        .where(eq(leads.tenantId, tenantId)),
      
      this.db.client
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, tenantId),
            gte(customers.createdAt, startDate),
            lte(customers.createdAt, endDate)
          )
        ),
    ]);

    const activeCustomers = allCustomers.filter(c => c.isActive).length;
    const leadsByStatus = {
      new: allLeads.filter(l => l.status === 'new').length,
      contacted: allLeads.filter(l => l.status === 'contacted').length,
      qualified: allLeads.filter(l => l.status === 'qualified').length,
      converted: allLeads.filter(l => l.status === 'converted').length,
      lost: allLeads.filter(l => l.status === 'lost').length,
    };

    const conversionRate = allLeads.length > 0
      ? (leadsByStatus.converted / allLeads.length) * 100
      : 0;

    return {
      totalCustomers: allCustomers.length,
      activeCustomers,
      newCustomers: newCustomers.length,
      totalLeads: allLeads.length,
      leadsByStatus,
      conversionRate,
      customerGrowthRate: allCustomers.length > 0 
        ? (newCustomers.length / allCustomers.length) * 100 
        : 0,
    };
  }

  async getVehiclesMetrics(tenantId: string) {
    const [allVehicles, allDrivers] = await Promise.all([
      this.db.client
        .select()
        .from(vehicles)
        .where(eq(vehicles.tenantId, tenantId)),
      
      this.db.client
        .select()
        .from(drivers)
        .where(eq(drivers.tenantId, tenantId)),
    ]);

    const vehiclesByStatus = {
      available: allVehicles.filter(v => v.status === 'available').length,
      inUse: allVehicles.filter(v => v.status === 'in_use').length,
      maintenance: allVehicles.filter(v => v.status === 'maintenance').length,
      inactive: allVehicles.filter(v => v.status === 'inactive').length,
    };

    const driversByStatus = {
      available: allDrivers.filter(d => d.status === 'available').length,
      onDuty: allDrivers.filter(d => d.status === 'on_duty').length,
      offDuty: allDrivers.filter(d => d.status === 'off_duty').length,
      onLeave: allDrivers.filter(d => d.status === 'on_leave').length,
    };

    const utilizationRate = allVehicles.length > 0
      ? (vehiclesByStatus.inUse / allVehicles.length) * 100
      : 0;

    return {
      totalVehicles: allVehicles.length,
      vehiclesByStatus,
      totalDrivers: allDrivers.length,
      driversByStatus,
      utilizationRate,
      vehiclesPerDriver: allDrivers.length > 0 
        ? allVehicles.length / allDrivers.length 
        : 0,
    };
  }

  async getFinancialSummary(tenantId: string, year: number, month?: number) {
    const startDate = month 
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    
    const endDate = month
      ? new Date(year, month, 0)
      : new Date(year, 11, 31);

    const allInvoices = await this.db.client
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          gte(invoices.invoiceDate, startDate.toISOString().split('T')[0]),
          lte(invoices.invoiceDate, endDate.toISOString().split('T')[0])
        )
      );

    const monthlyBreakdown = [];
    const months = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);

    for (const m of months) {
      const monthStart = new Date(year, m - 1, 1);
      const monthEnd = new Date(year, m, 0);
      
      const monthInvoices = allInvoices.filter(inv => {
        const invDate = new Date(inv.invoiceDate);
        return invDate >= monthStart && invDate <= monthEnd;
      });

      const totalRevenue = monthInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.totalAmount || '0'),
        0
      );

      const totalPaid = monthInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.paidAmount || '0'),
        0
      );

      monthlyBreakdown.push({
        month: m,
        year,
        totalRevenue,
        totalPaid,
        outstanding: totalRevenue - totalPaid,
        invoiceCount: monthInvoices.length,
      });
    }

    return {
      period: month ? `${year}-${month}` : `${year}`,
      monthlyBreakdown,
      totalRevenue: monthlyBreakdown.reduce((sum, m) => sum + m.totalRevenue, 0),
      totalPaid: monthlyBreakdown.reduce((sum, m) => sum + m.totalPaid, 0),
      totalOutstanding: monthlyBreakdown.reduce((sum, m) => sum + m.outstanding, 0),
      totalInvoices: monthlyBreakdown.reduce((sum, m) => sum + m.invoiceCount, 0),
    };
  }

  async getOperationalMetrics(tenantId: string, startDate: Date, endDate: Date) {
    const allRoutes = await this.db.client
      .select()
      .from(routes)
      .where(
        and(
          eq(routes.tenantId, tenantId),
          gte(routes.routeDate, startDate.toISOString().split('T')[0]),
          lte(routes.routeDate, endDate.toISOString().split('T')[0])
        )
      );

    const completedRoutes = allRoutes.filter(r => r.status === 'completed');
    
    const totalDistance = completedRoutes.reduce(
      (sum, r) => sum + parseFloat(r.totalDistance || '0'),
      0
    );

    const totalDuration = completedRoutes.reduce(
      (sum, r) => sum + (r.estimatedDuration || 0),
      0
    );

    const avgSpeed = totalDuration > 0 
      ? (totalDistance / (totalDuration / 60)) 
      : 0;

    return {
      totalRoutes: allRoutes.length,
      completedRoutes: completedRoutes.length,
      completionRate: allRoutes.length > 0 
        ? (completedRoutes.length / allRoutes.length) * 100 
        : 0,
      totalDistance,
      totalDuration,
      averageSpeed: avgSpeed,
      averageRouteDistance: completedRoutes.length > 0 
        ? totalDistance / completedRoutes.length 
        : 0,
      averageRouteDuration: completedRoutes.length > 0 
        ? totalDuration / completedRoutes.length 
        : 0,
    };
  }
}

