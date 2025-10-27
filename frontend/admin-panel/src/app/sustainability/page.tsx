'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/design-system/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/design-system/Tabs';
import { Button } from '@/components/design-system/Button';
import { Progress } from '@/components/design-system/Progress';
import { Badge } from '@/components/design-system/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/design-system/Table';
import { sustainabilityApi } from '@/lib/api-comprehensive';

interface CarbonMetric {
  id: string;
  category: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  period: string;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface WasteReduction {
  id: string;
  type: string;
  currentAmount: number;
  targetAmount: number;
  unit: string;
  reductionPercentage: number;
  costSavings: number;
  currency: string;
}

interface EnvironmentalGoal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  status: 'on-track' | 'behind' | 'completed' | 'at-risk';
  priority: 'low' | 'medium' | 'high';
}

export default function SustainabilityPage() {
  const [carbonMetrics, setCarbonMetrics] = useState<CarbonMetric[]>([]);
  const [wasteReductions, setWasteReductions] = useState<WasteReduction[]>([]);
  const [goals, setGoals] = useState<EnvironmentalGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('carbon');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls when backend is ready
      // const [carbonResponse, wasteResponse, goalsResponse] = await Promise.all([
      //   sustainabilityApi.getCarbonFootprint(),
      //   sustainabilityApi.getWasteReduction(),
      //   sustainabilityApi.getEnvironmentalMetrics()
      // ]);

      // Mock data for now
      setCarbonMetrics([
        {
          id: '1',
          category: 'Transportation',
          currentValue: 1250,
          targetValue: 1000,
          unit: 'kg CO2',
          period: 'Monthly',
          trend: 'down',
          lastUpdated: new Date().toISOString()
        },
        {
          id: '2',
          category: 'Warehouse Operations',
          currentValue: 800,
          targetValue: 600,
          unit: 'kg CO2',
          period: 'Monthly',
          trend: 'stable',
          lastUpdated: new Date().toISOString()
        },
        {
          id: '3',
          category: 'Packaging',
          currentValue: 300,
          targetValue: 200,
          unit: 'kg CO2',
          period: 'Monthly',
          trend: 'up',
          lastUpdated: new Date().toISOString()
        }
      ]);

      setWasteReductions([
        {
          id: '1',
          type: 'Paper Reduction',
          currentAmount: 45,
          targetAmount: 30,
          unit: 'kg/month',
          reductionPercentage: 25,
          costSavings: 1250,
          currency: 'TRY'
        },
        {
          id: '2',
          type: 'Plastic Waste',
          currentAmount: 20,
          targetAmount: 10,
          unit: 'kg/month',
          reductionPercentage: 50,
          costSavings: 800,
          currency: 'TRY'
        }
      ]);

      setGoals([
        {
          id: '1',
          title: 'Reduce Carbon Footprint by 30%',
          description: 'Decrease overall carbon emissions through optimized routing and electric vehicles',
          targetValue: 30,
          currentValue: 18,
          unit: '% reduction',
          deadline: '2025-12-31',
          status: 'on-track',
          priority: 'high'
        },
        {
          id: '2',
          title: 'Zero Waste Initiative',
          description: 'Achieve zero waste to landfill through recycling and composting',
          targetValue: 100,
          currentValue: 65,
          unit: '% waste diverted',
          deadline: '2025-06-30',
          status: 'behind',
          priority: 'medium'
        }
      ]);
    } catch (error) {
      console.error('Error loading sustainability data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'on-track': return 'default';
      case 'behind': return 'destructive';
      case 'at-risk': return 'destructive';
      default: return 'secondary';
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sustainability & ESG</h1>
        <p className="text-gray-600">Environmental, Social, and Governance performance tracking</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="carbon">Carbon Footprint</TabsTrigger>
          <TabsTrigger value="waste">Waste Reduction</TabsTrigger>
          <TabsTrigger value="goals">Goals & Targets</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="carbon" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Carbon Emissions</CardTitle>
                <CardDescription>Track and monitor carbon footprint across operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {carbonMetrics.map((metric) => (
                    <div key={metric.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{metric.category}</span>
                        <Badge variant={metric.trend === 'down' ? 'default' : 'secondary'}>
                          {metric.trend}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{metric.currentValue} {metric.unit}</span>
                        <span>Target: {metric.targetValue} {metric.unit}</span>
                      </div>
                      <Progress
                        value={(metric.targetValue - metric.currentValue) / metric.targetValue * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emissions Summary</CardTitle>
                <CardDescription>Monthly carbon footprint overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">2,350</div>
                      <div className="text-sm text-gray-600">kg CO2 Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">1,800</div>
                      <div className="text-sm text-gray-600">kg CO2 Target</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Progress to Target</span>
                      <span className="text-sm font-medium">23% reduction</span>
                    </div>
                    <Progress value={23} className="h-2" />
                  </div>

                  <Button className="w-full">Generate Carbon Report</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="waste" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Waste Reduction Programs</CardTitle>
              <CardDescription>Track waste reduction initiatives and cost savings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Initiative</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reduction</TableHead>
                    <TableHead>Savings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wasteReductions.map((reduction) => (
                    <TableRow key={reduction.id}>
                      <TableCell className="font-medium">{reduction.type}</TableCell>
                      <TableCell>{reduction.currentAmount} {reduction.unit}</TableCell>
                      <TableCell>{reduction.targetAmount} {reduction.unit}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {reduction.reductionPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {reduction.costSavings} {reduction.currency}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Environmental Goals</CardTitle>
              <CardDescription>Track progress towards sustainability targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{goal.title}</h3>
                        <p className="text-sm text-gray-600">{goal.description}</p>
                      </div>
                      <Badge variant={getStatusColor(goal.status)}>
                        {goal.status.replace('-', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                      </div>
                      <Progress
                        value={(goal.currentValue / goal.targetValue) * 100}
                        className="h-2"
                      />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Priority: {goal.priority}</span>
                        <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sustainability Reports</CardTitle>
              <CardDescription>Generate and download environmental reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <div className="font-medium">Carbon Footprint Report</div>
                  <div className="text-sm text-gray-500">Monthly emissions summary</div>
                </Button>

                <Button variant="outline" className="h-20 flex-col">
                  <div className="font-medium">Waste Management Report</div>
                  <div className="text-sm text-gray-500">Waste reduction metrics</div>
                </Button>

                <Button variant="outline" className="h-20 flex-col">
                  <div className="font-medium">ESG Compliance Report</div>
                  <div className="text-sm text-gray-500">Environmental compliance status</div>
                </Button>

                <Button variant="outline" className="h-20 flex-col">
                  <div className="font-medium">Sustainability Dashboard</div>
                  <div className="text-sm text-gray-500">Comprehensive overview</div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
