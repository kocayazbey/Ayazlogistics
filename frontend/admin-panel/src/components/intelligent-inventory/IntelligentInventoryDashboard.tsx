import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Zap, 
  Target,
  Activity,
  Brain,
  BarChart,
  PieChart,
  LineChart
} from 'lucide-react';

interface InventoryAnalysis {
  analysisId: string;
  warehouseId: string;
  analysisPeriod: number;
  totalProducts: number;
  results: Array<{
    productId: string;
    sku: string;
    productName: string;
    currentStock: number;
    abcCategory: 'A' | 'B' | 'C';
    xyzCategory: 'X' | 'Y' | 'Z';
    demandVariability: number;
    leadTime: number;
    safetyStock: number;
    reorderPoint: number;
    economicOrderQuantity: number;
    stockoutRisk: number;
    carryingCost: number;
    stockoutCost: number;
    recommendations: string[];
  }>;
  summary: {
    categoryADistribution: number;
    categoryBDistribution: number;
    categoryCDistribution: number;
    averageStockoutRisk: number;
    totalInventoryValue: number;
    optimizationPotential: number;
  };
}

interface ReorderRecommendation {
  productId: string;
  sku: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  recommendedQuantity: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  expectedStockoutDate: Date;
  costImpact: number;
  supplierLeadTime: number;
  recommendedAction: string;
}

const IntelligentInventoryDashboard: React.FC = () => {
  const [analysis, setAnalysis] = useState<InventoryAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');

  useEffect(() => {
    fetchInventoryAnalysis();
    fetchReorderRecommendations();
  }, [selectedWarehouse]);

  const fetchInventoryAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/wms/intelligent-inventory/abc-xyz-analysis?warehouseId=${selectedWarehouse}&analysisPeriod=90`);
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error fetching inventory analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReorderRecommendations = async () => {
    try {
      const response = await fetch(`/api/v1/wms/intelligent-inventory/reorder-recommendations?warehouseId=${selectedWarehouse}`);
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error fetching reorder recommendations:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getABCCategoryColor = (category: string) => {
    switch (category) {
      case 'A': return 'bg-red-100 text-red-800 border-red-200';
      case 'B': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'C': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getXYZCategoryColor = (category: string) => {
    switch (category) {
      case 'X': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Y': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Z': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Intelligent Inventory Management</h1>
          <p className="text-gray-600 mt-2">AI-powered inventory optimization and analysis</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Run Analysis</span>
          </Button>
          <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
            <Zap className="h-4 w-4" />
            <span>Optimize Now</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Products</p>
                <p className="text-2xl font-bold text-blue-900">{analysis?.totalProducts || 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Category A Items</p>
                <p className="text-2xl font-bold text-green-900">
                  {Math.round((analysis?.summary.categoryADistribution || 0) * (analysis?.totalProducts || 0))}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Avg Stockout Risk</p>
                <p className="text-2xl font-bold text-orange-900">
                  {((analysis?.summary.averageStockoutRisk || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Optimization Potential</p>
                <p className="text-2xl font-bold text-purple-900">
                  {((analysis?.summary.optimizationPotential || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis">ABC/XYZ Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Reorder Recommendations</TabsTrigger>
          <TabsTrigger value="forecasts">Demand Forecasts</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* ABC/XYZ Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>ABC/XYZ Analysis Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Category Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-800">Category A</h3>
                    <p className="text-2xl font-bold text-red-900">
                      {((analysis?.summary.categoryADistribution || 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-red-600">High Value Items</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h3 className="font-semibold text-yellow-800">Category B</h3>
                    <p className="text-2xl font-bold text-yellow-900">
                      {((analysis?.summary.categoryBDistribution || 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-yellow-600">Medium Value Items</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800">Category C</h3>
                    <p className="text-2xl font-bold text-green-900">
                      {((analysis?.summary.categoryCDistribution || 0) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-green-600">Low Value Items</p>
                  </div>
                </div>

                {/* Analysis Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Product</th>
                        <th className="text-left p-3 font-semibold">Stock</th>
                        <th className="text-left p-3 font-semibold">ABC</th>
                        <th className="text-left p-3 font-semibold">XYZ</th>
                        <th className="text-left p-3 font-semibold">Stockout Risk</th>
                        <th className="text-left p-3 font-semibold">EOQ</th>
                        <th className="text-left p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis?.results.slice(0, 10).map((item) => (
                        <tr key={item.productId} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-gray-500">{item.sku}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{item.currentStock}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.currentStock < item.reorderPoint ? 'Low' : 'OK'}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={getABCCategoryColor(item.abcCategory)}>
                              {item.abcCategory}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={getXYZCategoryColor(item.xyzCategory)}>
                              {item.xyzCategory}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <Progress 
                                value={item.stockoutRisk * 100} 
                                className="w-16 h-2"
                              />
                              <span className="text-sm font-medium">
                                {(item.stockoutRisk * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-medium">{item.economicOrderQuantity}</span>
                          </td>
                          <td className="p-3">
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reorder Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Reorder Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div key={rec.productId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-lg">{rec.productName}</h3>
                          <Badge className={`${getUrgencyColor(rec.urgencyLevel)} text-white`}>
                            {rec.urgencyLevel.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{rec.sku}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-sm text-gray-500">Current Stock</p>
                            <p className="font-semibold">{rec.currentStock}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Reorder Point</p>
                            <p className="font-semibold">{rec.reorderPoint}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Recommended Qty</p>
                            <p className="font-semibold text-blue-600">{rec.recommendedQuantity}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Lead Time</p>
                            <p className="font-semibold">{rec.supplierLeadTime} days</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Action:</strong> {rec.recommendedAction}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Approve Order
                        </Button>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demand Forecasts Tab */}
        <TabsContent value="forecasts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LineChart className="h-5 w-5" />
                <span>Demand Forecasts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Demand Forecasting</h3>
                <p className="text-gray-600 mb-4">AI-powered demand predictions for inventory planning</p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Generate Forecasts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Inventory Optimization</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Optimization</h3>
                <p className="text-gray-600 mb-4">AI-driven inventory level optimization</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Start Optimization
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntelligentInventoryDashboard;
