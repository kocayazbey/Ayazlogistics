import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Route, 
  Clock, 
  Fuel, 
  DollarSign, 
  TrendingUp,
  Navigation,
  Zap,
  BarChart3,
  Globe,
  Car,
  Truck,
  Plane,
  Ship
} from 'lucide-react';

interface RouteOptimization {
  routes: Array<{
    vehicleId: string;
    driverId: string;
    totalDistance: number;
    totalDuration: number;
    totalCost: number;
    fuelConsumption: number;
    co2Emissions: number;
    stops: Array<{
      destinationId: string;
      arrivalTime: Date;
      departureTime: Date;
      serviceTime: number;
      waitingTime: number;
      distanceFromPrevious: number;
      estimatedCost: number;
    }>;
    optimization: {
      efficiency: number;
      feasibility: number;
      costSavings: number;
      timeSavings: number;
    };
  }>;
  summary: {
    totalRoutes: number;
    totalDistance: number;
    totalDuration: number;
    totalCost: number;
    averageEfficiency: number;
    unassignedDestinations: string[];
    recommendations: string[];
  };
}

interface RealTimeData {
  traffic: {
    congestionLevel: number;
    averageSpeed: number;
    incidents: Array<{
      type: string;
      severity: string;
      location: { latitude: number; longitude: number };
      description: string;
      estimatedDuration: number;
    }>;
  };
  weather: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    visibility: number;
    roadConditions: string;
    weatherWarnings: string[];
  };
  fuelPrices: {
    diesel: number;
    gasoline: number;
    electric: number;
  };
  timeFactors: {
    isRushHour: boolean;
    isWeekend: boolean;
    isHoliday: boolean;
    trafficMultiplier: number;
  };
}

const RouteOptimizationDashboard: React.FC = () => {
  const [optimization, setOptimization] = useState<RouteOptimization | null>(null);
  const [realTimeData, setRealTimeData] = useState<RealTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('genetic');

  useEffect(() => {
    fetchRouteOptimization();
    fetchRealTimeData();
  }, [selectedAlgorithm]);

  const fetchRouteOptimization = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/tms/dynamic-route-optimization/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { latitude: 41.0082, longitude: 28.9784, address: 'Istanbul, Turkey' },
          destinations: [
            { id: 'dest-1', latitude: 40.7128, longitude: -74.0060, address: 'New York, NY' },
            { id: 'dest-2', latitude: 51.5074, longitude: -0.1278, address: 'London, UK' }
          ],
          vehicle: { id: 'vehicle-1', capacity: 1000, volumeCapacity: 10 },
          constraints: { maxRouteDuration: 480, maxDistance: 100 },
          realTimeFactors: { includeTraffic: true, includeWeather: true, includeFuelPrices: true }
        })
      });
      const data = await response.json();
      setOptimization(data);
    } catch (error) {
      console.error('Error fetching route optimization:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const response = await fetch('/api/v1/tms/dynamic-route-optimization/real-time-data?origin=41.0082,28.9784&destination=40.7128,-74.0060');
      const data = await response.json();
      setRealTimeData(data);
    } catch (error) {
      console.error('Error fetching real-time data:', error);
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'truck': return <Truck className="h-5 w-5" />;
      case 'van': return <Car className="h-5 w-5" />;
      case 'aircraft': return <Plane className="h-5 w-5" />;
      case 'ship': return <Ship className="h-5 w-5" />;
      default: return <Car className="h-5 w-5" />;
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 0.8) return 'text-green-600';
    if (efficiency >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCongestionColor = (level: number) => {
    if (level >= 0.8) return 'bg-red-500';
    if (level >= 0.6) return 'bg-orange-500';
    if (level >= 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dynamic Route Optimization</h1>
          <p className="text-gray-600 mt-2">AI-powered route planning with real-time data</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Navigation className="h-4 w-4" />
            <span>Plan New Route</span>
          </Button>
          <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
            <Zap className="h-4 w-4" />
            <span>Optimize Now</span>
          </Button>
        </div>
      </div>

      {/* Real-time Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Traffic Congestion</p>
                <p className="text-2xl font-bold text-red-900">
                  {((realTimeData?.traffic.congestionLevel || 0) * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-red-600">
                  Avg Speed: {realTimeData?.traffic.averageSpeed || 0} km/h
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${getCongestionColor(realTimeData?.traffic.congestionLevel || 0)}`}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Weather</p>
                <p className="text-2xl font-bold text-blue-900">
                  {realTimeData?.weather.temperature || 0}°C
                </p>
                <p className="text-sm text-blue-600">
                  {realTimeData?.weather.roadConditions || 'Good'}
                </p>
              </div>
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Fuel Prices</p>
                <p className="text-2xl font-bold text-green-900">
                  ₺{realTimeData?.fuelPrices.diesel || 0}
                </p>
                <p className="text-sm text-green-600">Diesel per liter</p>
              </div>
              <Fuel className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Time Factor</p>
                <p className="text-2xl font-bold text-purple-900">
                  {realTimeData?.timeFactors.trafficMultiplier || 1.0}x
                </p>
                <p className="text-sm text-purple-600">
                  {realTimeData?.timeFactors.isRushHour ? 'Rush Hour' : 'Normal'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="optimization" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="optimization">Route Optimization</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Data</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Route Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Route className="h-5 w-5" />
                <span>Optimized Routes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-800">Total Routes</h3>
                    <p className="text-2xl font-bold text-blue-900">{optimization?.summary.totalRoutes || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-800">Total Distance</h3>
                    <p className="text-2xl font-bold text-green-900">{optimization?.summary.totalDistance || 0} km</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <h3 className="font-semibold text-orange-800">Total Duration</h3>
                    <p className="text-2xl font-bold text-orange-900">{optimization?.summary.totalDuration || 0} min</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-purple-800">Total Cost</h3>
                    <p className="text-2xl font-bold text-purple-900">₺{optimization?.summary.totalCost || 0}</p>
                  </div>
                </div>

                {/* Route Details */}
                <div className="space-y-4">
                  {optimization?.routes.map((route, index) => (
                    <div key={route.vehicleId} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getVehicleIcon('truck')}
                          <div>
                            <h3 className="font-semibold text-lg">Route {index + 1}</h3>
                            <p className="text-sm text-gray-600">Vehicle: {route.vehicleId}</p>
                          </div>
                        </div>
                        <Badge className={`${getEfficiencyColor(route.optimization.efficiency)} bg-opacity-20`}>
                          {route.optimization.efficiency.toFixed(1)}% Efficient
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Distance:</span>
                          <span className="font-semibold">{route.totalDistance} km</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Duration:</span>
                          <span className="font-semibold">{route.totalDuration} min</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Cost:</span>
                          <span className="font-semibold">₺{route.totalCost}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Fuel className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Fuel:</span>
                          <span className="font-semibold">{route.fuelConsumption}L</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600">Cost Savings</p>
                          <p className="font-bold text-green-800">₺{route.optimization.costSavings}</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-600">Time Savings</p>
                          <p className="font-bold text-blue-800">{route.optimization.timeSavings} min</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm text-purple-600">CO2 Emissions</p>
                          <p className="font-bold text-purple-800">{route.co2Emissions} kg</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Route Stops ({route.stops.length})</h4>
                        <div className="space-y-2">
                          {route.stops.map((stop, stopIndex) => (
                            <div key={stopIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm">Stop {stopIndex + 1}</span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span>{stop.distanceFromPrevious} km</span>
                                <span>{stop.serviceTime} min</span>
                                <span>₺{stop.estimatedCost}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-time Data Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traffic Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Traffic Conditions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Congestion Level</span>
                    <span className="text-lg font-bold">
                      {((realTimeData?.traffic.congestionLevel || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={realTimeData?.traffic.congestionLevel || 0} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Speed</span>
                    <span className="text-lg font-bold">{realTimeData?.traffic.averageSpeed || 0} km/h</span>
                  </div>

                  {realTimeData?.traffic.incidents.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-sm mb-2">Traffic Incidents</h4>
                      <div className="space-y-2">
                        {realTimeData.traffic.incidents.map((incident, index) => (
                          <div key={index} className="p-2 bg-red-50 rounded border border-red-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-red-800">{incident.type}</span>
                              <Badge variant="destructive" className="text-xs">
                                {incident.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-red-600 mt-1">{incident.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Weather Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Weather Conditions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Temperature</p>
                      <p className="text-xl font-bold text-blue-800">
                        {realTimeData?.weather.temperature || 0}°C
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600">Humidity</p>
                      <p className="text-xl font-bold text-green-800">
                        {realTimeData?.weather.humidity || 0}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-600">Wind Speed</p>
                      <p className="text-xl font-bold text-orange-800">
                        {realTimeData?.weather.windSpeed || 0} km/h
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600">Precipitation</p>
                      <p className="text-xl font-bold text-purple-800">
                        {realTimeData?.weather.precipitation || 0} mm/h
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium">Road Conditions</p>
                    <p className="text-lg font-bold">{realTimeData?.weather.roadConditions || 'Good'}</p>
                  </div>

                  {realTimeData?.weather.weatherWarnings.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-sm mb-2">Weather Warnings</h4>
                      <div className="space-y-1">
                        {realTimeData.weather.weatherWarnings.map((warning, index) => (
                          <div key={index} className="p-2 bg-yellow-50 rounded border border-yellow-200">
                            <p className="text-sm text-yellow-800">{warning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Route Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Performance Analytics</h3>
                <p className="text-gray-600 mb-4">Detailed performance metrics and analytics</p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  View Performance Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Route Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
                <p className="text-gray-600 mb-4">Comprehensive route analysis and insights</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Generate Analytics Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RouteOptimizationDashboard;
