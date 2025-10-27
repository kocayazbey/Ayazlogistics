import React, { useState } from 'react';

interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (key: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    onChange?.(key);
  };

  const currentTab = tabs.find((tab) => tab.key === activeTab);

  return (
    <div className="w-full">
      <div className="border-b border-gray-200 bg-white rounded-t-2xl">
        <nav className="flex gap-1 px-4 pt-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="bg-white rounded-b-2xl p-6 animate-scale-in">
        {currentTab?.content}
      </div>
    </div>
  );
};

