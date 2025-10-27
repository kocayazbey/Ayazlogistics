import React, { useState } from 'react';
import { useDrivers } from '../../hooks/useDrivers';
import { Driver } from '../../lib/api/drivers.api';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  FunnelIcon,
  ArrowUpDownIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

interface DriversListProps {
  onDriverSelect?: (driver: Driver) => void;
  onDriverEdit?: (driver: Driver) => void;
  onDriverDelete?: (driver: Driver) => void;
  onCreateDriver?: () => void;
}

export default function DriversList({
  onDriverSelect,
  onDriverEdit,
  onDriverDelete,
  onCreateDriver
}: DriversListProps) {
  const {
    drivers,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    setPage,
    setLimit,
    setSearch,
    setStatus,
    setSortBy,
    setSortOrder,
    deleteDriver,
    refreshDrivers
  } = useDrivers();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortByState] = useState('');
  const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setSearch(value);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setStatus(status);
  };

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortByState(field);
    setSortOrderState(newOrder);
    setSortBy(field);
    setSortOrder(newOrder);
  };

  const handleDelete = async (driver: Driver) => {
    if (window.confirm(`Are you sure you want to delete driver ${driver.firstName} ${driver.lastName}?`)) {
      const success = await deleteDriver(driver.id);
      if (success) {
        refreshDrivers();
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'busy':
        return 'Busy';
      case 'offline':
        return 'Offline';
      case 'maintenance':
        return 'Maintenance';
      default:
        return status;
    }
  };

  if (loading && drivers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={refreshDrivers}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Drivers</h2>
          <p className="text-gray-600">Manage your fleet drivers</p>
        </div>
        <button
          onClick={onCreateDriver}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Driver
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => handleSort(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Default</option>
                  <option value="firstName">Name</option>
                  <option value="status">Status</option>
                  <option value="rating">Rating</option>
                  <option value="createdAt">Created Date</option>
                </select>
              </div>

              {/* Results Per Page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Page
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {drivers.length} of {total} drivers
        </span>
        <span>
          Page {page} of {totalPages}
        </span>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <div
            key={driver.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Driver Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TruckIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {driver.firstName} {driver.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">#{driver.driverNumber}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(driver.status)}`}>
                {getStatusText(driver.status)}
              </span>
            </div>

            {/* Driver Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium">Phone:</span>
                <span className="ml-2">{driver.phone}</span>
              </div>
              {driver.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">Email:</span>
                  <span className="ml-2">{driver.email}</span>
                </div>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium">License:</span>
                <span className="ml-2">{driver.licenseNumber}</span>
              </div>
              {driver.rating && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">Rating:</span>
                  <span className="ml-2 flex items-center">
                    {driver.rating.toFixed(1)} ⭐
                  </span>
                </div>
              )}
            </div>

            {/* Stats */}
            {(driver.totalRoutes || driver.completedRoutes) && (
              <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {driver.totalRoutes || 0}
                  </div>
                  <div className="text-xs text-gray-600">Total Routes</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {driver.completedRoutes || 0}
                  </div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => onDriverSelect?.(driver)}
                className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                View
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onDriverEdit?.(driver)}
                  className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(driver)}
                  className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {drivers.length === 0 && !loading && (
        <div className="text-center py-12">
          <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No drivers found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first driver'
            }
          </p>
          {!searchTerm && !statusFilter && (
            <button
              onClick={onCreateDriver}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Driver
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded-lg ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
