import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3, 
  Target,
  Activity,
  Brain,
  Zap,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  FileText,
  Settings
} from 'lucide-react';

interface RiskProfile {
  id: string;
  name: string;
  description: string;
  type: 'operational' | 'financial' | 'strategic' | 'compliance' | 'reputational' | 'cybersecurity' | 'supply_chain' | 'market' | 'credit' | 'liquidity';
  level: 'low' | 'medium' | 'high' | 'critical';
  status: 'identified' | 'assessed' | 'mitigated' | 'monitored' | 'closed';
  score: number;
  factors: Array<{
    factor: string;
    impact: number;
    probability: number;
    severity: number;
  }>;
  indicators: Array<{
    indicator: string;
    value: number;
    threshold: number;
    status: string;
  }>;
  mitigation: Array<{
    strategy: string;
    effectiveness: number;
    cost: number;
    timeline: string;
    status: string;
  }>;
  monitoring: {
    frequency: string;
    metrics: string[];
    alerts: string[];
    reporting: string[];
  };
  owner: string;
  stakeholders: string[];
  timeline: {
    identified: Date;
    assessed: Date;
    mitigated: Date;
    monitored: Date;
    closed: Date;
  };
}

interface RiskAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description: string;
  riskType: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  timestamp: Date;
  acknowledgedBy: string;
  acknowledgedAt: Date;
  resolvedBy: string;
  resolvedAt: Date;
  resolution: string;
  actions: string[];
}

interface RiskMetrics {
  totalRisks: number;
  activeRisks: number;
  mitigatedRisks: number;
  criticalRisks: number;
  riskScore: number;
  riskTrend: string;
  mitigationProgress: number;
  complianceScore: number;
  alertCount: number;
  resolutionTime: number;
}

const RiskAssessmentDashboard: React.FC = () => {
  const [riskProfiles, setRiskProfiles] = useState<RiskProfile[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRiskType, setSelectedRiskType] = useState<string>('all');

  useEffect(() => {
    fetchRiskProfiles();
    fetchRiskAlerts();
    fetchRiskMetrics();
  }, [selectedRiskType]);

  const fetchRiskProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/risk/assessment/profiles');
      const data = await response.json();
      setRiskProfiles(data);
    } catch (error) {
      console.error('Error fetching risk profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskAlerts = async () => {
    try {
      const response = await fetch('/api/v1/risk/assessment/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching risk alerts:', error);
    }
  };

  const fetchRiskMetrics = async () => {
    try {
      const response = await fetch('/api/v1/risk/assessment/metrics?timeRange=30');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching risk metrics:', error);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskTypeColor = (type: string) => {
    const colors = {
      'operational': 'bg-blue-100 text-blue-800',
      'financial': 'bg-green-100 text-green-800',
      'strategic': 'bg-purple-100 text-purple-800',
      'compliance': 'bg-yellow-100 text-yellow-800',
      'reputational': 'bg-red-100 text-red-800',
      'cybersecurity': 'bg-orange-100 text-orange-800',
      'supply_chain': 'bg-indigo-100 text-indigo-800',
      'market': 'bg-pink-100 text-pink-800',
      'credit': 'bg-teal-100 text-teal-800',
      'liquidity': 'bg-cyan-100 text-cyan-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold text-gray-900">Risk Assessment & Management</h1>
          <p className="text-gray-600 mt-2">Comprehensive risk analysis and mitigation strategies</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Assess Risk</span>
          </Button>
          <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
            <Zap className="h-4 w-4" />
            <span>Create Policy</span>
          </Button>
        </div>
      </div>

      {/* Risk Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Critical Risks</p>
                <p className="text-2xl font-bold text-red-900">{metrics?.criticalRisks || 0}</p>
                <p className="text-sm text-red-600">Require immediate attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Active Risks</p>
                <p className="text-2xl font-bold text-blue-900">{metrics?.activeRisks || 0}</p>
                <p className="text-sm text-blue-600">Currently being monitored</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Mitigated Risks</p>
                <p className="text-2xl font-bold text-green-900">{metrics?.mitigatedRisks || 0}</p>
                <p className="text-sm text-green-600">Successfully addressed</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Risk Score</p>
                <p className="text-2xl font-bold text-purple-900">{metrics?.riskScore || 0}</p>
                <p className="text-sm text-purple-600">Overall risk level</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="profiles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profiles">Risk Profiles</TabsTrigger>
          <TabsTrigger value="alerts">Risk Alerts</TabsTrigger>
          <TabsTrigger value="mitigation">Mitigation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Risk Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Risk Profiles</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskProfiles.map((profile) => (
                  <div key={profile.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{profile.name}</h3>
                          <p className="text-sm text-gray-600">{profile.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getRiskLevelColor(profile.level)}>
                          {profile.level.toUpperCase()}
                        </Badge>
                        <Badge className={getRiskTypeColor(profile.type)}>
                          {profile.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Risk Score</h4>
                        <div className="flex items-center space-x-2">
                          <Progress value={profile.score} className="flex-1 h-2" />
                          <span className="font-semibold">{profile.score}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Risk Factors</h4>
                        <div className="space-y-1">
                          {profile.factors.slice(0, 3).map((factor, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">{factor.factor}</span>
                              <span className="font-semibold">{(factor.impact * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Mitigation Status</h4>
                        <div className="space-y-1">
                          {profile.mitigation.slice(0, 2).map((mit, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">{mit.strategy}</span>
                              <Badge variant="outline" className="text-xs">
                                {mit.status}
                              </Badge>
                            </div>
                          ))}
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
                            <Settings className="h-3 w-3 mr-1" />
                            Manage
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Target className="h-3 w-3 mr-1" />
                            Mitigate
                          </Button>
                        </div>
                        <div className="text-sm text-gray-500">
                          Owner: {profile.owner}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Risk Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`}></div>
                        <h3 className="font-semibold text-lg">{alert.message}</h3>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <Badge className={getStatusColor(alert.status)}>
                        {alert.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <p className="text-gray-600 text-sm mb-3">{alert.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-500">Risk Type</p>
                        <p className="font-semibold">{alert.riskType.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Alert Type</p>
                        <p className="font-semibold">{alert.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Timestamp</p>
                        <p className="font-semibold">{new Date(alert.timestamp).toLocaleString()}</p>
                      </div>
                    </div>

                    {alert.actions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Recommended Actions:</p>
                        <div className="flex flex-wrap gap-1">
                          {alert.actions.map((action, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                        {alert.status === 'open' && (
                          <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Activity className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {alert.acknowledgedBy && `Acknowledged by: ${alert.acknowledgedBy}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mitigation Tab */}
        <TabsContent value="mitigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Risk Mitigation Strategies</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Mitigation Strategies</h3>
                <p className="text-gray-600 mb-4">Comprehensive risk mitigation planning and execution</p>
                <Button className="bg-green-600 hover:bg-green-700">
                  View Mitigation Plans
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
                <span>Risk Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk Analytics Dashboard</h3>
                <p className="text-gray-600 mb-4">Comprehensive risk analysis and reporting</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Generate Risk Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskAssessmentDashboard;
