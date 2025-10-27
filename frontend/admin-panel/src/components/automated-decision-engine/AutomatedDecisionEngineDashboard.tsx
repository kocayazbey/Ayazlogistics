import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Zap, 
  Target, 
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Edit,
  Trash2,
  Plus,
  BarChart3,
  TrendingUp,
  Users,
  Shield,
  DollarSign
} from 'lucide-react';

interface DecisionRule {
  id: string;
  name: string;
  description: string;
  category: 'operational' | 'financial' | 'risk' | 'customer' | 'logistics' | 'compliance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'draft' | 'testing';
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
    logic: 'AND' | 'OR';
  }>;
  actions: Array<{
    type: string;
    parameters: any;
    description: string;
  }>;
  executionCount: number;
  successRate: number;
  lastExecuted: Date;
  createdBy: string;
  createdAt: Date;
}

interface DecisionExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: string;
  input: any;
  output: any;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  executionTime: number;
  timestamp: Date;
  errorMessage?: string;
  confidence: number;
  recommendations: string[];
}

interface DecisionAnalytics {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  topPerformingRules: Array<{
    ruleId: string;
    ruleName: string;
    executions: number;
    successRate: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  performanceMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

const AutomatedDecisionEngineDashboard: React.FC = () => {
  const [rules, setRules] = useState<DecisionRule[]>([]);
  const [executions, setExecutions] = useState<DecisionExecution[]>([]);
  const [analytics, setAnalytics] = useState<DecisionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchDecisionRules();
    fetchRecentExecutions();
    fetchAnalytics();
  }, [selectedCategory]);

  const fetchDecisionRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/decision-engine/rules?category=${selectedCategory}`);
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Error fetching decision rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentExecutions = async () => {
    try {
      const response = await fetch('/api/v1/decision-engine/executions?limit=20');
      const data = await response.json();
      setExecutions(data);
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/decision-engine/analytics?timeRange=30');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'operational': 'bg-blue-100 text-blue-800',
      'financial': 'bg-green-100 text-green-800',
      'risk': 'bg-red-100 text-red-800',
      'customer': 'bg-purple-100 text-purple-800',
      'logistics': 'bg-orange-100 text-orange-800',
      'compliance': 'bg-yellow-100 text-yellow-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'testing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold text-gray-900">Automated Decision Engine</h1>
          <p className="text-gray-600 mt-2">AI-powered automated decision making and business rules</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configure Rules</span>
          </Button>
          <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            <span>Create Rule</span>
          </Button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Rules</p>
                <p className="text-2xl font-bold text-blue-900">{analytics?.totalRules || 0}</p>
                <p className="text-sm text-blue-600">{analytics?.activeRules || 0} active</p>
              </div>
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-900">{analytics?.successRate || 0}%</p>
                <p className="text-sm text-green-600">Decision accuracy</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Executions</p>
                <p className="text-2xl font-bold text-purple-900">{analytics?.totalExecutions || 0}</p>
                <p className="text-sm text-purple-600">This month</p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Avg Execution Time</p>
                <p className="text-2xl font-bold text-orange-900">{analytics?.averageExecutionTime || 0}ms</p>
                <p className="text-sm text-orange-600">Response time</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rules">Decision Rules</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        {/* Decision Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Decision Rules</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Brain className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{rule.name}</h3>
                          <p className="text-sm text-gray-600">{rule.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getCategoryColor(rule.category)}>
                          {rule.category}
                        </Badge>
                        <Badge className={getStatusColor(rule.status)}>
                          {rule.status}
                        </Badge>
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(rule.priority)}`}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Conditions</h4>
                        <div className="space-y-1">
                          {rule.conditions.slice(0, 3).map((condition, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              {condition.field} {condition.operator} {condition.value}
                            </div>
                          ))}
                          {rule.conditions.length > 3 && (
                            <div className="text-sm text-gray-500">
                              +{rule.conditions.length - 3} more conditions
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Actions</h4>
                        <div className="space-y-1">
                          {rule.actions.slice(0, 2).map((action, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              {action.type}: {action.description}
                            </div>
                          ))}
                          {rule.actions.length > 2 && (
                            <div className="text-sm text-gray-500">
                              +{rule.actions.length - 2} more actions
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Performance</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Executions:</span>
                            <span className="font-semibold">{rule.executionCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Success Rate:</span>
                            <span className="font-semibold">{(rule.successRate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Last Executed:</span>
                            <span className="font-semibold">
                              {new Date(rule.lastExecuted).toLocaleDateString()}
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
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline">
                            <Play className="h-3 w-3 mr-1" />
                            Test
                          </Button>
                          {rule.status === 'active' ? (
                            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                              <Pause className="h-3 w-3 mr-1" />
                              Pause
                            </Button>
                          ) : (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <Play className="h-3 w-3 mr-1" />
                              Activate
                            </Button>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Created by: {rule.createdBy}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Executions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executions.map((execution) => (
                  <div key={execution.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          execution.status === 'success' ? 'bg-green-500' :
                          execution.status === 'failed' ? 'bg-red-500' :
                          execution.status === 'pending' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}></div>
                        <h3 className="font-semibold text-lg">{execution.ruleName}</h3>
                        <Badge className={getExecutionStatusColor(execution.status)}>
                          {execution.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(execution.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-500">Trigger</p>
                        <p className="font-semibold">{execution.trigger}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Execution Time</p>
                        <p className="font-semibold">{execution.executionTime}ms</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Confidence</p>
                        <p className="font-semibold">{(execution.confidence * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <div className="flex items-center space-x-2">
                          <Progress value={execution.confidence * 100} className="w-16 h-2" />
                          <span className="text-sm font-semibold">
                            {execution.status === 'success' ? '✓' : 
                             execution.status === 'failed' ? '✗' : '⏳'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {execution.errorMessage && (
                      <div className="mb-3 p-3 bg-red-50 rounded border border-red-200">
                        <p className="text-sm text-red-800">
                          <strong>Error:</strong> {execution.errorMessage}
                        </p>
                      </div>
                    )}

                    {execution.recommendations.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Recommendations:</p>
                        <div className="flex flex-wrap gap-1">
                          {execution.recommendations.map((rec, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {rec}
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
                        <Button size="sm" variant="outline">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Replay
                        </Button>
                      </div>
                      <div className="text-sm text-gray-500">
                        Rule ID: {execution.ruleId}
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
                  <BarChart3 className="h-5 w-5" />
                  <span>Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Accuracy</span>
                    <span className="font-semibold">{(analytics?.performanceMetrics.accuracy || 0).toFixed(2)}</span>
                  </div>
                  <Progress value={(analytics?.performanceMetrics.accuracy || 0) * 100} className="h-2" />
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Precision</span>
                    <span className="font-semibold">{(analytics?.performanceMetrics.precision || 0).toFixed(2)}</span>
                  </div>
                  <Progress value={(analytics?.performanceMetrics.precision || 0) * 100} className="h-2" />
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Recall</span>
                    <span className="font-semibold">{(analytics?.performanceMetrics.recall || 0).toFixed(2)}</span>
                  </div>
                  <Progress value={(analytics?.performanceMetrics.recall || 0) * 100} className="h-2" />
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">F1 Score</span>
                    <span className="font-semibold">{(analytics?.performanceMetrics.f1Score || 0).toFixed(2)}</span>
                  </div>
                  <Progress value={(analytics?.performanceMetrics.f1Score || 0) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Category Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.categoryDistribution.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-red-500' : 
                          index === 1 ? 'bg-yellow-500' : 
                          index === 2 ? 'bg-green-500' : 
                          'bg-blue-500'
                        }`}></div>
                        <span className="font-medium">{category.category}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={category.percentage} className="w-20 h-2" />
                        <span className="text-sm font-semibold">{category.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Top Performing Rules</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.topPerformingRules.map((rule, index) => (
                  <div key={rule.ruleId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{rule.ruleName}</p>
                        <p className="text-sm text-gray-600">{rule.executions} executions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{(rule.successRate * 100).toFixed(1)}%</p>
                      <p className="text-sm text-gray-500">Success Rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Rule Testing & Validation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rule Testing Environment</h3>
                <p className="text-gray-600 mb-4">Test and validate decision rules before deployment</p>
                <div className="flex space-x-4 justify-center">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Play className="h-4 w-4 mr-2" />
                    Test Rule
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Test Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomatedDecisionEngineDashboard;
