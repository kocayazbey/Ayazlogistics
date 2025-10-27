'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Table } from '@/components/design-system/Table';
import { Modal } from '@/components/design-system/Modal';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  features: string[];
  isActive: boolean;
  maxUsers: number;
  maxStorage: number; // GB
}

interface UsageBasedPricing {
  id: string;
  name: string;
  metric: string;
  unit: string;
  pricePerUnit: number;
  currency: string;
  isActive: boolean;
}

interface OverageRule {
  id: string;
  name: string;
  tierId: string;
  metric: string;
  threshold: number;
  overageRate: number;
  currency: string;
  isActive: boolean;
}

interface PricingCalculation {
  tierId: string;
  usage: Record<string, number>;
  basePrice: number;
  usageCost: number;
  overageCost: number;
  totalCost: number;
}

export default function PricingPage() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [usagePricing, setUsagePricing] = useState<UsageBasedPricing[]>([]);
  const [overageRules, setOverageRules] = useState<OverageRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showOverageModal, setShowOverageModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [calculation, setCalculation] = useState<PricingCalculation | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch pricing tiers
      const tiersResponse = await fetch('/api/v1/corporate/pricing/tiers');
      const tiersData = await tiersResponse.json();
      setTiers(tiersData);

      // Fetch usage-based pricing
      const usageResponse = await fetch('/api/v1/corporate/pricing/usage-based');
      const usageData = await usageResponse.json();
      setUsagePricing(usageData);

      // Fetch overage rules
      const overageResponse = await fetch('/api/v1/corporate/pricing/overage-rules');
      const overageData = await overageResponse.json();
      setOverageRules(overageData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = async (tierId: string, usage: Record<string, number>) => {
    try {
      const response = await fetch('/api/v1/corporate/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId, usage })
      });
      const result = await response.json();
      setCalculation(result);
    } catch (error) {
      console.error('Error calculating pricing:', error);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Pricing Management</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setShowTierModal(true)}>Create Tier</Button>
          <Button onClick={() => setShowUsageModal(true)}>Add Usage Pricing</Button>
          <Button onClick={() => setShowOverageModal(true)}>Add Overage Rule</Button>
          <Button onClick={() => setShowCalculatorModal(true)}>Pricing Calculator</Button>
        </div>
      </div>

      {/* Pricing Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <Card key={tier.id} className="p-6 border-2 hover:border-blue-500 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                  <Badge variant={tier.isActive ? 'success' : 'default'}>
                    {tier.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-4">{tier.description}</p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-blue-600">${tier.basePrice}</span>
                  <span className="text-gray-500">/{tier.currency}</span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Max Users:</span>
                    <span className="font-medium">{tier.maxUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Max Storage:</span>
                    <span className="font-medium">{tier.maxStorage} GB</span>
                  </div>
                </div>
                <ul className="text-sm space-y-1 mb-4">
                  {tier.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full">Edit Tier</Button>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage-Based Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Usage-Based Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Metric</th>
                <th>Unit</th>
                <th>Price per Unit</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usagePricing.map((pricing) => (
                <tr key={pricing.id}>
                  <td className="font-medium">{pricing.name}</td>
                  <td>{pricing.metric}</td>
                  <td>{pricing.unit}</td>
                  <td>${pricing.pricePerUnit}</td>
                  <td>{pricing.currency}</td>
                  <td>
                    <Badge variant={pricing.isActive ? 'success' : 'default'}>
                      {pricing.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <Button variant="outline" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Overage Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Overage Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Tier</th>
                <th>Metric</th>
                <th>Threshold</th>
                <th>Overage Rate</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overageRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="font-medium">{rule.name}</td>
                  <td>{rule.tierId}</td>
                  <td>{rule.metric}</td>
                  <td>{rule.threshold}</td>
                  <td>${rule.overageRate}</td>
                  <td>{rule.currency}</td>
                  <td>
                    <Badge variant={rule.isActive ? 'success' : 'default'}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <Button variant="outline" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Pricing Calculator */}
      {calculation && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Calculation Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Base Price</p>
                <p className="text-2xl font-bold text-blue-600">${calculation.basePrice}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Usage Cost</p>
                <p className="text-2xl font-bold text-green-600">${calculation.usageCost}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">Overage Cost</p>
                <p className="text-2xl font-bold text-yellow-600">${calculation.overageCost}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-purple-600">${calculation.totalCost}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <Modal isOpen={showTierModal} onClose={() => setShowTierModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create Pricing Tier</h2>
          <form className="space-y-4">
            <Input label="Name" placeholder="Tier Name" />
            <Input label="Description" placeholder="Tier Description" />
            <Input label="Base Price" type="number" placeholder="99" />
            <Input label="Currency" placeholder="USD" />
            <Input label="Max Users" type="number" placeholder="100" />
            <Input label="Max Storage (GB)" type="number" placeholder="1000" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTierModal(false)}>Cancel</Button>
              <Button>Create Tier</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showUsageModal} onClose={() => setShowUsageModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Usage-Based Pricing</h2>
          <form className="space-y-4">
            <Input label="Name" placeholder="Pricing Name" />
            <Input label="Metric" placeholder="API Calls" />
            <Input label="Unit" placeholder="per 1000" />
            <Input label="Price per Unit" type="number" placeholder="0.01" />
            <Input label="Currency" placeholder="USD" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowUsageModal(false)}>Cancel</Button>
              <Button>Add Pricing</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showOverageModal} onClose={() => setShowOverageModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Overage Rule</h2>
          <form className="space-y-4">
            <Input label="Name" placeholder="Rule Name" />
            <Select label="Tier" options={tiers.map(t => ({ value: t.id, label: t.name }))} />
            <Input label="Metric" placeholder="API Calls" />
            <Input label="Threshold" type="number" placeholder="10000" />
            <Input label="Overage Rate" type="number" placeholder="0.02" />
            <Input label="Currency" placeholder="USD" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowOverageModal(false)}>Cancel</Button>
              <Button>Add Rule</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showCalculatorModal} onClose={() => setShowCalculatorModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Pricing Calculator</h2>
          <form className="space-y-4">
            <Select label="Select Tier" options={tiers.map(t => ({ value: t.id, label: t.name }))} />
            <Input label="API Calls" type="number" placeholder="10000" />
            <Input label="Storage (GB)" type="number" placeholder="500" />
            <Input label="Users" type="number" placeholder="50" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCalculatorModal(false)}>Cancel</Button>
              <Button onClick={() => calculatePricing('tier-1', { apiCalls: 10000, storage: 500, users: 50 })}>
                Calculate
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
