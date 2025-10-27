'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Table } from '@/components/design-system/Table';
import { Modal } from '@/components/design-system/Modal';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';

interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isRTL: boolean;
  isActive: boolean;
  isDefault: boolean;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  isDefault: boolean;
  exchangeRate?: number;
  lastUpdated?: string;
}

interface TaxRule {
  id: string;
  country: string;
  region?: string;
  taxType: 'VAT' | 'GST' | 'Sales' | 'Service';
  rate: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

interface DataResidency {
  id: string;
  region: string;
  country: string;
  dataCenter: string;
  compliance: string[];
  isActive: boolean;
}

export default function InternationalizationPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [dataResidency, setDataResidency] = useState<DataResidency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showDataResidencyModal, setShowDataResidencyModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch languages
      const languagesResponse = await fetch('/api/v1/i18n/languages');
      const languagesData = await languagesResponse.json();
      setLanguages(languagesData);

      // Fetch currencies
      const currenciesResponse = await fetch('/api/v1/i18n/currencies');
      const currenciesData = await currenciesResponse.json();
      setCurrencies(currenciesData);

      // Fetch tax rules
      const taxResponse = await fetch('/api/v1/i18n/tax-rules');
      const taxData = await taxResponse.json();
      setTaxRules(taxData);

      // Fetch data residency
      const residencyResponse = await fetch('/api/v1/i18n/data-residency');
      const residencyData = await residencyResponse.json();
      setDataResidency(residencyData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return <Badge variant={isActive ? 'success' : 'default'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
  };

  const getDefaultBadge = (isDefault: boolean) => {
    return isDefault ? <Badge variant="info">Default</Badge> : null;
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
        <h1 className="text-3xl font-bold text-gray-900">Internationalization</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setShowLanguageModal(true)}>Add Language</Button>
          <Button onClick={() => setShowCurrencyModal(true)}>Add Currency</Button>
          <Button onClick={() => setShowTaxModal(true)}>Add Tax Rule</Button>
          <Button onClick={() => setShowDataResidencyModal(true)}>Add Data Residency</Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Languages</p>
                <p className="text-2xl font-bold text-gray-900">
                  {languages.filter(l => l.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Currencies</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currencies.filter(c => c.isActive).length}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tax Rules</p>
                <p className="text-2xl font-bold text-gray-900">{taxRules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Data Regions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dataResidency.filter(d => d.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle>Languages</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Native Name</th>
                <th>RTL</th>
                <th>Status</th>
                <th>Default</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {languages.map((language) => (
                <tr key={language.id}>
                  <td className="font-medium">{language.code}</td>
                  <td>{language.name}</td>
                  <td>{language.nativeName}</td>
                  <td>{language.isRTL ? 'Yes' : 'No'}</td>
                  <td>{getStatusBadge(language.isActive)}</td>
                  <td>{getDefaultBadge(language.isDefault)}</td>
                  <td>
                    <Button variant="outline" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Currencies */}
      <Card>
        <CardHeader>
          <CardTitle>Currencies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Symbol</th>
                <th>Decimal Places</th>
                <th>Exchange Rate</th>
                <th>Status</th>
                <th>Default</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((currency) => (
                <tr key={currency.id}>
                  <td className="font-medium">{currency.code}</td>
                  <td>{currency.name}</td>
                  <td>{currency.symbol}</td>
                  <td>{currency.decimalPlaces}</td>
                  <td>{currency.exchangeRate ? currency.exchangeRate.toFixed(4) : 'N/A'}</td>
                  <td>{getStatusBadge(currency.isActive)}</td>
                  <td>{getDefaultBadge(currency.isDefault)}</td>
                  <td>
                    <Button variant="outline" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Tax Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Country</th>
                <th>Region</th>
                <th>Tax Type</th>
                <th>Rate</th>
                <th>Effective From</th>
                <th>Effective To</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {taxRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="font-medium">{rule.country}</td>
                  <td>{rule.region || 'N/A'}</td>
                  <td>{rule.taxType}</td>
                  <td>{rule.rate}%</td>
                  <td>{new Date(rule.effectiveFrom).toLocaleDateString()}</td>
                  <td>{rule.effectiveTo ? new Date(rule.effectiveTo).toLocaleDateString() : 'N/A'}</td>
                  <td>{getStatusBadge(rule.isActive)}</td>
                  <td>
                    <Button variant="outline" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Residency */}
      <Card>
        <CardHeader>
          <CardTitle>Data Residency</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Region</th>
                <th>Country</th>
                <th>Data Center</th>
                <th>Compliance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dataResidency.map((residency) => (
                <tr key={residency.id}>
                  <td className="font-medium">{residency.region}</td>
                  <td>{residency.country}</td>
                  <td>{residency.dataCenter}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {residency.compliance.map((comp, index) => (
                        <Badge key={index} variant="outline">{comp}</Badge>
                      ))}
                    </div>
                  </td>
                  <td>{getStatusBadge(residency.isActive)}</td>
                  <td>
                    <Button variant="outline" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <Modal isOpen={showLanguageModal} onClose={() => setShowLanguageModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Language</h2>
          <form className="space-y-4">
            <Input label="Language Code" placeholder="tr" />
            <Input label="Language Name" placeholder="Turkish" />
            <Input label="Native Name" placeholder="Türkçe" />
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="rtl" />
              <label htmlFor="rtl">Right-to-Left</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="active" />
              <label htmlFor="active">Active</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="default" />
              <label htmlFor="default">Default</label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowLanguageModal(false)}>Cancel</Button>
              <Button>Add Language</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showCurrencyModal} onClose={() => setShowCurrencyModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Currency</h2>
          <form className="space-y-4">
            <Input label="Currency Code" placeholder="TRY" />
            <Input label="Currency Name" placeholder="Turkish Lira" />
            <Input label="Symbol" placeholder="₺" />
            <Input label="Decimal Places" type="number" placeholder="2" />
            <Input label="Exchange Rate" type="number" placeholder="1.0" />
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="active" />
              <label htmlFor="active">Active</label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="default" />
              <label htmlFor="default">Default</label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCurrencyModal(false)}>Cancel</Button>
              <Button>Add Currency</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showTaxModal} onClose={() => setShowTaxModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Tax Rule</h2>
          <form className="space-y-4">
            <Input label="Country" placeholder="TR" />
            <Input label="Region" placeholder="Istanbul" />
            <Select label="Tax Type" options={[
              { value: 'VAT', label: 'VAT' },
              { value: 'GST', label: 'GST' },
              { value: 'Sales', label: 'Sales' },
              { value: 'Service', label: 'Service' }
            ]} />
            <Input label="Rate (%)" type="number" placeholder="18" />
            <Input label="Effective From" type="date" />
            <Input label="Effective To" type="date" />
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="active" />
              <label htmlFor="active">Active</label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTaxModal(false)}>Cancel</Button>
              <Button>Add Tax Rule</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showDataResidencyModal} onClose={() => setShowDataResidencyModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Data Residency</h2>
          <form className="space-y-4">
            <Input label="Region" placeholder="Europe" />
            <Input label="Country" placeholder="Germany" />
            <Input label="Data Center" placeholder="Frankfurt" />
            <Input label="Compliance (comma separated)" placeholder="GDPR, ISO27001" />
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="active" />
              <label htmlFor="active">Active</label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDataResidencyModal(false)}>Cancel</Button>
              <Button>Add Data Residency</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
