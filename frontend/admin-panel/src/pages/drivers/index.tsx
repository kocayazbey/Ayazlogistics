import React, { useState } from 'react';
import { useDrivers } from '../../hooks/useDrivers';
import { Driver, CreateDriverRequest, UpdateDriverRequest } from '../../lib/api/drivers.api';
import DriversList from '../../components/drivers/DriversList';
import DriverForm from '../../components/drivers/DriverForm';
import { 
  TruckIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function DriversPage() {
  const {
    drivers,
    total,
    loading,
    createDriver,
    updateDriver,
    refreshDrivers
  } = useDrivers();

  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const handleCreateDriver = async (data: CreateDriverRequest) => {
    try {
      await createDriver(data);
      setShowForm(false);
      await refreshDrivers();
    } catch (error) {
      console.error('Error creating driver:', error);
    }
  };

  const handleUpdateDriver = async (data: UpdateDriverRequest) => {
    if (!editingDriver) return;

    try {
      await updateDriver(editingDriver.id, data);
      setEditingDriver(null);
      await refreshDrivers();
    } catch (error) {
      console.error('Error updating driver:', error);
    }
  };

  const handleDriverSelect = (driver: Driver) => {
    setSelectedDriver(driver);
  };

  const handleDriverEdit = (driver: Driver) => {
    setEditingDriver(driver);
  };

  const handleDriverDelete = (driver: Driver) => {
    // Delete is handled in the DriversList component
    console.log('Delete driver:', driver);
  };

  const handleCreateClick = () => {
    setShowForm(true);
    setEditingDriver(null);
  };

  const handleEditClick = (driver: Driver) => {
    setEditingDriver(driver);
    setShowForm(true);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingDriver(null);
  };

  // Calculate statistics
  const stats = {
    total: total,
    available: drivers.filter(d => d.status === 'available').length,
    busy: drivers.filter(d => d.status === 'busy').length,
    offline: drivers.filter(d => d.status === 'offline').length,
    maintenance: drivers.filter(d => d.status === 'maintenance').length,
    averageRating: drivers.length > 0 
      ? drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length 
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Drivers Management</h1>
            <p className="text-gray-600 mt-1">
              Manage your fleet drivers, track performance, and assign vehicles
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshDrivers}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ClockIcon className="h-5 w-5 mr-2" />
              Refresh
            </button>
            <button
              onClick={handleCreateClick}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <TruckIcon className="h-5 w-5 mr-2" />
              Add Driver
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Busy</p>
              <p className="text-2xl font-bold text-gray-900">{stats.busy}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <TruckIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Offline</p>
              <p className="text-2xl font-bold text-gray-900">{stats.offline}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TruckIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.maintenance}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Average Rating Card */}
      {stats.averageRating > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Average Driver Rating</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.averageRating.toFixed(1)} ⭐
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Based on {drivers.length} drivers</p>
            </div>
          </div>
        </div>
      )}

      {/* Drivers List */}
      <DriversList
        onDriverSelect={handleDriverSelect}
        onDriverEdit={handleEditClick}
        onDriverDelete={handleDriverDelete}
        onCreateDriver={handleCreateClick}
      />

      {/* Driver Form Modal */}
      {showForm && (
        <DriverForm
          driver={editingDriver || undefined}
          onSubmit={editingDriver ? handleUpdateDriver : handleCreateDriver}
          onCancel={handleFormCancel}
          loading={loading}
        />
      )}

      {/* Driver Details Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Driver Details
              </h2>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-gray-900">{selectedDriver.firstName} {selectedDriver.lastName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{selectedDriver.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{selectedDriver.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Driver Number</label>
                      <p className="text-gray-900">#{selectedDriver.driverNumber}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">License & Status</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">License Number</label>
                      <p className="text-gray-900">{selectedDriver.licenseNumber}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedDriver.status === 'available' ? 'bg-green-100 text-green-800' :
                        selectedDriver.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                        selectedDriver.status === 'offline' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedDriver.status}
                      </span>
                    </div>
                    {selectedDriver.rating && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Rating</label>
                        <p className="text-gray-900">{selectedDriver.rating.toFixed(1)} ⭐</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(selectedDriver.totalRoutes || selectedDriver.completedRoutes) && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">Total Routes</p>
                      <p className="text-2xl font-bold text-gray-900">{selectedDriver.totalRoutes || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{selectedDriver.completedRoutes || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedDriver(null);
                    handleEditClick(selectedDriver);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Driver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
