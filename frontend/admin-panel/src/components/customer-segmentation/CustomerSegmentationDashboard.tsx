import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Target, 
  TrendingUp, 
  Brain, 
  BarChart3, 
  PieChart,
  UserCheck,
  Star,
  DollarSign,
  Activity,
  Zap,
  Eye,
  Filter,
  Download
} from 'lucide-react';

interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    behavioral: {
      orderFrequency: { min: number; max: number };
      averageOrderValue: { min: number; max: number };
      totalValue: { min: number; max: number };
    };
    demographic: {
      industry: string[];
      customerType: string[];
      companySize: string[];
    };
    financial: {
      creditScore: { min: number; max: number };
      paymentReliability: { min: number; max: number };
    };
  };
  characteristics: string[];
  strategies: {
    marketing: string[];
    sales: string[];
    service: string[];
    pricing: string[];
  };
  kpis: {
    targetRetention: number;
    targetGrowth: number;
    targetSatisfaction: number;
  };
  customerCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerProfile {
  customerId: string;
  basicInfo: {
    name: string;
    companyName: string;
    industry: string;
    customerType: 'individual' | 'business' | 'enterprise' | 'government';
    registrationDate: Date;
    lastActivityDate: Date;
  };
  behavioralMetrics: {
    totalOrders: number;
    totalValue: number;
    averageOrderValue: number;
    orderFrequency: number;
    lastOrderDate: Date;
    preferredServiceTypes: string[];
    preferredDeliveryTimes: string[];
    preferredPaymentMethods: string[];
    customerLifetimeValue: number;
    churnRisk: number;
    satisfactionScore: number;
  };
  segment: {
    primary: string;
    secondary: string;
    confidence: number;
    characteristics: string[];
    recommendations: string[];
  };
  aiInsights: {
    predictedChurn: number;
    nextOrderPrediction: Date;
    recommendedServices: string[];
    upsellingOpportunities: string[];
    crossSellingOpportunities: string[];
    personalizedOffers: string[];
  };
}

interface SegmentationAnalytics {
  totalCustomers: number;
  segmentDistribution: Array<{
    segment: string;
    count: number;
    percentage: number;
  }>;
  averageCustomerValue: number;
  topPerformingSegments: string[];
  recommendations: string[];
  growthMetrics: {
    newCustomers: number;
    churnedCustomers: number;
    netGrowth: number;
    growthRate: number;
  };
  revenueMetrics: {
    totalRevenue: number;
    averageRevenuePerCustomer: number;
    revenueBySegment: Array<{
      segment: string;
      revenue: number;
      percentage: number;
    }>;
  };
}

const CustomerSegmentationDashboard: React.FC = () => {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>([]);
  const [analytics, setAnalytics] = useState<SegmentationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<string>('all');

  useEffect(() => {
    fetchSegments();
    fetchCustomerProfiles();
    fetchAnalytics();
  }, [selectedSegment]);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/crm/customer-segmentation/segments');
      const data = await response.json();
      setSegments(data);
    } catch (error) {
      console.error('Error fetching segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerProfiles = async () => {
    try {
      const response = await fetch(`/api/v1/crm/customer-segmentation/profiles?segmentId=${selectedSegment}&limit=20`);
      const data = await response.json();
      setCustomerProfiles(data);
    } catch (error) {
      console.error('Error fetching customer profiles:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/crm/customer-segmentation/analytics?timeRange=30');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const getSegmentColor = (segmentName: string) => {
    const colors = {
      'High Value': 'bg-red-100 text-red-800 border-red-200',
      'Medium Value': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Low Value': 'bg-green-100 text-green-800 border-green-200',
      'Enterprise': 'bg-purple-100 text-purple-800 border-purple-200',
      'SMB': 'bg-blue-100 text-blue-800 border-blue-200',
      'Government': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[segmentName as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'business': return 'bg-blue-100 text-blue-800';
      case 'individual': return 'bg-green-100 text-green-800';
      case 'government': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChurnRiskColor = (risk: number) => {
    if (risk >= 0.7) return 'text-red-600';
    if (risk >= 0.4) return 'text-yellow-600';
    return 'text-green-600';
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
          <h1 className="text-3xl font-bold text-gray-900">Customer Segmentation & Personalization</h1>
          <p className="text-gray-600 mt-2">AI-driven customer analysis and segmentation</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Run Analysis</span>
          </Button>
          <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
            <Zap className="h-4 w-4" />
            <span>Create Segment</span>
          </Button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Customers</p>
                <p className="text-2xl font-bold text-blue-900">{analytics?.totalCustomers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Avg Customer Value</p>
                <p className="text-2xl font-bold text-green-900">
                  ₺{analytics?.averageCustomerValue.toLocaleString() || 0}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Growth Rate</p>
                <p className="text-2xl font-bold text-orange-900">
                  {((analytics?.growthMetrics.growthRate || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Active Segments</p>
                <p className="text-2xl font-bold text-purple-900">{segments.length}</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="segments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="customers">Customer Profiles</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="personalization">Personalization</TabsTrigger>
        </TabsList>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Customer Segments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {segments.map((segment) => (
                  <div key={segment.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">{segment.name}</h3>
                      <Badge className={getSegmentColor(segment.name)}>
                        {segment.customerCount} customers
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">{segment.description}</p>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Characteristics</h4>
                        <div className="flex flex-wrap gap-1">
                          {segment.characteristics.slice(0, 3).map((char, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {char}
                            </Badge>
                          ))}
                          {segment.characteristics.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{segment.characteristics.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-green-50 rounded">
                          <p className="text-xs text-green-600">Retention</p>
                          <p className="text-sm font-bold text-green-800">
                            {(segment.kpis.targetRetention * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-xs text-blue-600">Growth</p>
                          <p className="text-sm font-bold text-blue-800">
                            {(segment.kpis.targetGrowth * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="p-2 bg-purple-50 rounded">
                          <p className="text-xs text-purple-600">Satisfaction</p>
                          <p className="text-sm font-bold text-purple-800">
                            {segment.kpis.targetSatisfaction.toFixed(1)}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700">
                          <Filter className="h-3 w-3 mr-1" />
                          Filter
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Profiles Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Customer Profiles</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerProfiles.map((profile) => (
                  <div key={profile.customerId} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCheck className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{profile.basicInfo.name}</h3>
                          <p className="text-sm text-gray-600">{profile.basicInfo.companyName}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getCustomerTypeColor(profile.basicInfo.customerType)}>
                          {profile.basicInfo.customerType}
                        </Badge>
                        <Badge className={getSegmentColor(profile.segment.primary)}>
                          {profile.segment.primary}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Behavioral Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Orders:</span>
                            <span className="font-semibold">{profile.behavioralMetrics.totalOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Value:</span>
                            <span className="font-semibold">₺{profile.behavioralMetrics.totalValue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Avg Order Value:</span>
                            <span className="font-semibold">₺{profile.behavioralMetrics.averageOrderValue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Lifetime Value:</span>
                            <span className="font-semibold text-green-600">₺{profile.behavioralMetrics.customerLifetimeValue.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Risk & Satisfaction</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Churn Risk:</span>
                            <span className={`font-semibold ${getChurnRiskColor(profile.behavioralMetrics.churnRisk)}`}>
                              {(profile.behavioralMetrics.churnRisk * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Satisfaction:</span>
                            <div className="flex items-center space-x-2">
                              <Progress value={profile.behavioralMetrics.satisfactionScore * 20} className="w-16 h-2" />
                              <span className="font-semibold">{profile.behavioralMetrics.satisfactionScore.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Segment Confidence:</span>
                            <span className="font-semibold">{(profile.segment.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">AI Insights</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Predicted Churn:</span>
                            <span className={`font-semibold ${getChurnRiskColor(profile.aiInsights.predictedChurn)}`}>
                              {(profile.aiInsights.predictedChurn * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Next Order:</span>
                            <span className="font-semibold">
                              {new Date(profile.aiInsights.nextOrderPrediction).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Upselling:</span>
                            <span className="font-semibold text-blue-600">
                              {profile.aiInsights.upsellingOpportunities.length} opportunities
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                          <Button size="sm" variant="outline">
                            <Brain className="h-3 w-3 mr-1" />
                            AI Insights
                          </Button>
                          <Button size="sm" variant="outline">
                            <Star className="h-3 w-3 mr-1" />
                            Personalize
                          </Button>
                        </div>
                        <div className="text-sm text-gray-500">
                          Last active: {new Date(profile.basicInfo.lastActivityDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Segment Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.segmentDistribution.map((segment, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-red-500' : 
                          index === 1 ? 'bg-yellow-500' : 
                          index === 2 ? 'bg-green-500' : 
                          'bg-blue-500'
                        }`}></div>
                        <span className="font-medium">{segment.segment}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={segment.percentage} className="w-20 h-2" />
                        <span className="text-sm font-semibold">{segment.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Revenue by Segment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.revenueMetrics.revenueBySegment.map((segment, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-red-500' : 
                          index === 1 ? 'bg-yellow-500' : 
                          index === 2 ? 'bg-green-500' : 
                          'bg-blue-500'
                        }`}></div>
                        <span className="font-medium">{segment.segment}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₺{segment.revenue.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{segment.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Personalization Tab */}
        <TabsContent value="personalization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Personalization Engine</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Personalization</h3>
                <p className="text-gray-600 mb-4">Intelligent customer personalization and recommendations</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Configure Personalization
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerSegmentationDashboard;
