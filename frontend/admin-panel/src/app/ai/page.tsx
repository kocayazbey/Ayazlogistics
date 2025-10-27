'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/design-system/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/design-system/Tabs';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/design-system/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/design-system/Table';
import { Badge } from '@/components/design-system/Badge';
import { aiApi } from '@/lib/api-comprehensive';

interface DemandForecast {
  id: string;
  product: string;
  currentDemand: number;
  predictedDemand: number;
  confidence: number;
  period: string;
  status: 'active' | 'pending' | 'completed';
}

interface AnomalyDetection {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: string;
  resolved: boolean;
}

export default function AIPage() {
  const [demandForecasts, setDemandForecasts] = useState<DemandForecast[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('forecast');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Replace with actual API calls
      const [forecastResponse, anomalyResponse] = await Promise.all([
        aiApi.getDemandForecast({}).catch(() => ({ data: [] })),
        aiApi.getAnomalyDetection().catch(() => ({ data: [] }))
      ]);

      setDemandForecasts(forecastResponse?.data || []);
      setAnomalies(anomalyResponse?.data || []);
    } catch (error) {
      console.error('Error loading AI data:', error);
      // Set empty arrays on error instead of mock data
      setDemandForecasts([]);
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRunForecast = async (productId: string) => {
    try {
      await aiApi.getDemandForecast({ productId });
      // Reload data after forecast
      loadData();
    } catch (error) {
      console.error('Error running forecast:', error);
    }
  };

  const handleResolveAnomaly = async (anomalyId: string) => {
    try {
      await aiApi.resolveAnomaly(anomalyId);
      // Reload data after resolving
      loadData();
    } catch (error) {
      console.error('Error resolving anomaly:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI & Machine Learning</h1>
        <p className="text-gray-600">Intelligent insights and automated decision making</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forecast">Demand Forecast</TabsTrigger>
          <TabsTrigger value="anomaly">Anomaly Detection</TabsTrigger>
          <TabsTrigger value="optimization">Route Optimization</TabsTrigger>
          <TabsTrigger value="pricing">Dynamic Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Demand Forecasting</CardTitle>
                <CardDescription>Predict future demand using AI algorithms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product1">Electronics Component A</SelectItem>
                        <SelectItem value="product2">Industrial Part B</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => handleRunForecast('selected')}>
                      Run Forecast
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Historical Data Period</label>
                    <Select defaultValue="30">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Forecast Results</CardTitle>
                <CardDescription>Latest demand predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Predicted</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demandForecasts.map((forecast) => (
                      <TableRow key={forecast.id}>
                        <TableCell>{forecast.product}</TableCell>
                        <TableCell>{forecast.currentDemand}</TableCell>
                        <TableCell>{forecast.predictedDemand}</TableCell>
                        <TableCell>{Math.round(forecast.confidence * 100)}%</TableCell>
                        <TableCell>
                          <Badge variant={forecast.status === 'active' ? 'default' : 'secondary'}>
                            {forecast.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="anomaly" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Detection</CardTitle>
              <CardDescription>Automated detection of unusual patterns and issues</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map((anomaly) => (
                    <TableRow key={anomaly.id}>
                      <TableCell>{anomaly.type}</TableCell>
                      <TableCell>
                        <Badge variant={
                          anomaly.severity === 'critical' ? 'destructive' :
                          anomaly.severity === 'high' ? 'destructive' :
                          anomaly.severity === 'medium' ? 'default' : 'secondary'
                        }>
                          {anomaly.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{anomaly.description}</TableCell>
                      <TableCell>{new Date(anomaly.detectedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={anomaly.resolved ? 'default' : 'secondary'}>
                          {anomaly.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!anomaly.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveAnomaly(anomaly.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Route Optimization</CardTitle>
              <CardDescription>AI-powered route optimization and load planning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Route optimization feature coming soon</p>
                <Button>Configure Optimization</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dynamic Pricing</CardTitle>
              <CardDescription>AI-driven dynamic pricing recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Dynamic pricing feature coming soon</p>
                <Button>Setup Pricing Rules</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
