'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Table } from '@/components/design-system/Table';
import { Modal } from '@/components/design-system/Modal';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';

interface DemandForecast {
  id: string;
  productId: string;
  forecastDate: string;
  predictedDemand: number;
  confidence: number;
  factors: string[];
  accuracy: number;
}

interface ETAEstimate {
  id: string;
  routeId: string;
  estimatedArrival: string;
  confidence: number;
  factors: string[];
  actualArrival?: string;
  accuracy?: number;
}

interface AnomalyDetection {
  id: string;
  type: 'demand_spike' | 'delivery_delay' | 'cost_anomaly' | 'inventory_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  impact: number;
}

interface DynamicPricing {
  id: string;
  productId: string;
  basePrice: number;
  adjustedPrice: number;
  adjustmentFactor: number;
  factors: string[];
  effectiveFrom: string;
  effectiveTo: string;
}

interface MetricsLayer {
  id: string;
  name: string;
  category: 'performance' | 'cost' | 'quality' | 'efficiency';
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  target: number;
  actual: number;
}

export default function AIAnalyticsPage() {
  const [demandForecasts, setDemandForecasts] = useState<DemandForecast[]>([]);
  const [etaEstimates, setEtaEstimates] = useState<ETAEstimate[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [dynamicPricing, setDynamicPricing] = useState<DynamicPricing[]>([]);
  const [metrics, setMetrics] = useState<MetricsLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch demand forecasts
      const forecastsResponse = await fetch('/api/v1/ai/analytics/demand-forecasts');
      const forecastsData = await forecastsResponse.json();
      setDemandForecasts(forecastsData);

      // Fetch ETA estimates
      const etaResponse = await fetch('/api/v1/ai/analytics/eta-estimates');
      const etaData = await etaResponse.json();
      setEtaEstimates(etaData);

      // Fetch anomalies
      const anomaliesResponse = await fetch('/api/v1/ai/analytics/anomalies');
      const anomaliesData = await anomaliesResponse.json();
      setAnomalies(anomaliesData);

      // Fetch dynamic pricing
      const pricingResponse = await fetch('/api/v1/ai/analytics/dynamic-pricing');
      const pricingData = await pricingResponse.json();
      setDynamicPricing(pricingData);

      // Fetch metrics
      const metricsResponse = await fetch('/api/v1/ai/analytics/metrics');
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      critical: 'error'
    } as const;

    return <Badge variant={variants[severity as keyof typeof variants] || 'default'}>{severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      new: 'info',
      investigating: 'warning',
      resolved: 'success',
      false_positive: 'default'
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '↗️';
    if (trend === 'down') return '↘️';
    return '→';
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
        <h1 className="text-3xl font-bold text-gray-900">AI Analytics & Insights</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setShowForecastModal(true)}>Generate Forecast</Button>
          <Button onClick={() => setShowAnomalyModal(true)}>Detect Anomalies</Button>
          <Button onClick={() => setShowPricingModal(true)}>Adjust Pricing</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Forecasts</p>
                <p className="text-2xl font-bold text-gray-900">{demandForecasts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ETA Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {etaEstimates.length > 0 
                    ? Math.round(etaEstimates.reduce((sum, eta) => sum + (eta.accuracy || 0), 0) / etaEstimates.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Anomalies</p>
                <p className="text-2xl font-bold text-gray-900">
                  {anomalies.filter(a => a.status === 'new' || a.status === 'investigating').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Dynamic Pricing</p>
                <p className="text-2xl font-bold text-gray-900">{dynamicPricing.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demand Forecasts */}
      <Card>
        <CardHeader>
          <CardTitle>Demand Forecasts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Forecast Date</th>
                <th>Predicted Demand</th>
                <th>Confidence</th>
                <th>Accuracy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {demandForecasts.map((forecast) => (
                <tr key={forecast.id}>
                  <td className="font-medium">{forecast.productId}</td>
                  <td>{new Date(forecast.forecastDate).toLocaleDateString()}</td>
                  <td>{forecast.predictedDemand}</td>
                  <td>{forecast.confidence}%</td>
                  <td>{forecast.accuracy}%</td>
                  <td>
                    <Button variant="outline" size="sm">View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Anomaly Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Anomaly Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Detected At</th>
                <th>Status</th>
                <th>Impact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((anomaly) => (
                <tr key={anomaly.id}>
                  <td className="font-medium capitalize">{anomaly.type.replace('_', ' ')}</td>
                  <td>{getSeverityBadge(anomaly.severity)}</td>
                  <td>{anomaly.description}</td>
                  <td>{new Date(anomaly.detectedAt).toLocaleString()}</td>
                  <td>{getStatusBadge(anomaly.status)}</td>
                  <td>${anomaly.impact}</td>
                  <td>
                    <Button variant="outline" size="sm">Investigate</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Dynamic Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Dynamic Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Base Price</th>
                <th>Adjusted Price</th>
                <th>Adjustment</th>
                <th>Effective From</th>
                <th>Effective To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dynamicPricing.map((pricing) => (
                <tr key={pricing.id}>
                  <td className="font-medium">{pricing.productId}</td>
                  <td>${pricing.basePrice}</td>
                  <td>${pricing.adjustedPrice}</td>
                  <td>
                    <span className={pricing.adjustmentFactor > 0 ? 'text-green-600' : 'text-red-600'}>
                      {pricing.adjustmentFactor > 0 ? '+' : ''}{pricing.adjustmentFactor}%
                    </span>
                  </td>
                  <td>{new Date(pricing.effectiveFrom).toLocaleDateString()}</td>
                  <td>{new Date(pricing.effectiveTo).toLocaleDateString()}</td>
                  <td>
                    <Button variant="outline" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Metrics Layer */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <Card key={metric.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{metric.name}</h3>
                  <span className="text-2xl">{getTrendIcon(metric.trend)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-2xl font-bold">{metric.value}</span>
                  <span className="text-sm text-gray-600">{metric.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Target: {metric.target}</span>
                  <span className="text-gray-600">Actual: {metric.actual}</span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(metric.actual / metric.target) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <Modal isOpen={showForecastModal} onClose={() => setShowForecastModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Generate Demand Forecast</h2>
          <form className="space-y-4">
            <Input label="Product ID" placeholder="Product ID" />
            <Input label="Forecast Date" type="date" />
            <Input label="Historical Period (days)" type="number" placeholder="30" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowForecastModal(false)}>Cancel</Button>
              <Button>Generate Forecast</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showAnomalyModal} onClose={() => setShowAnomalyModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Detect Anomalies</h2>
          <form className="space-y-4">
            <Select label="Detection Type" options={[
              { value: 'demand_spike', label: 'Demand Spike' },
              { value: 'delivery_delay', label: 'Delivery Delay' },
              { value: 'cost_anomaly', label: 'Cost Anomaly' },
              { value: 'inventory_anomaly', label: 'Inventory Anomaly' }
            ]} />
            <Input label="Time Range (days)" type="number" placeholder="7" />
            <Input label="Sensitivity" type="number" placeholder="0.8" min="0" max="1" step="0.1" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAnomalyModal(false)}>Cancel</Button>
              <Button>Detect Anomalies</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Adjust Dynamic Pricing</h2>
          <form className="space-y-4">
            <Input label="Product ID" placeholder="Product ID" />
            <Input label="Base Price" type="number" placeholder="100" />
            <Input label="Adjustment Factor (%)" type="number" placeholder="10" />
            <Input label="Effective From" type="datetime-local" />
            <Input label="Effective To" type="datetime-local" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPricingModal(false)}>Cancel</Button>
              <Button>Apply Pricing</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
