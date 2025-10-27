import React from 'react';
import { Button } from '@ayazlogistics/design-system';

export default function QuickActions() {
  const actions = [
    { icon: '📥', label: 'New Receiving', color: 'bg-blue-500' },
    { icon: '📦', label: 'Create Picking', color: 'bg-purple-500' },
    { icon: '🚚', label: 'Schedule Shipment', color: 'bg-green-500' },
    { icon: '🔢', label: 'Start Count', color: 'bg-orange-500' },
    { icon: '📄', label: 'Generate Invoice', color: 'bg-indigo-500' },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className="relative">
        <button className="w-16 h-16 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center text-2xl">
          ➕
        </button>
        
        <div className="absolute bottom-20 right-0 space-y-2 hidden group-hover:block">
          {actions.map((action, idx) => (
            <button
              key={idx}
              className={`${action.color} text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 hover:scale-105 transition-all whitespace-nowrap`}
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

