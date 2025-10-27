import React, { useState } from 'react';

export default function CustomerPortal() {
  const [trackingNumber, setTrackingNumber] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">A</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AyazLogistics</h1>
              <p className="text-xs text-gray-600">Customer Portal</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl">Sign In</button>
            <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl">Sign Up</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Track Your Shipment</h2>
          <p className="text-lg text-gray-600">Enter your tracking number to see real-time status</p>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter tracking number (e.g., TRK-2025-001)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
                Track
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Orders</h3>
            <p className="text-sm text-gray-600 mb-4">View and manage your orders</p>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">View Orders →</button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventory</h3>
            <p className="text-sm text-gray-600 mb-4">Check your stock levels</p>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">View Inventory →</button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Documents</h3>
            <p className="text-sm text-gray-600 mb-4">Access invoices and reports</p>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">View Documents →</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { type: 'Shipment', desc: 'Order #12345 shipped', time: '2 hours ago', icon: '🚚' },
              { type: 'Receiving', desc: 'PO #67890 received', time: '5 hours ago', icon: '📥' },
              { type: 'Invoice', desc: 'Invoice INV-001 generated', time: '1 day ago', icon: '💰' },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="text-3xl">{activity.icon}</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.desc}</p>
                  <p className="text-sm text-gray-500">{activity.type} • {activity.time}</p>
                </div>
                <button className="text-blue-600 hover:text-blue-700">View</button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">About Us</a></li>
                <li><a href="#" className="hover:text-blue-600">Contact</a></li>
                <li><a href="#" className="hover:text-blue-600">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">Warehousing</a></li>
                <li><a href="#" className="hover:text-blue-600">Transportation</a></li>
                <li><a href="#" className="hover:text-blue-600">3PL Services</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">Help Center</a></li>
                <li><a href="#" className="hover:text-blue-600">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-600">Contact Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-600">KVKK</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
            © 2025 AyazLogistics. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
