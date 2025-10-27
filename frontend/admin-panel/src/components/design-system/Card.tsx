import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  hoverable?: boolean;
  className?: string;
}

export default function Card({ children, title, hoverable = false, className = '' }: CardProps) {
  const hoverClass = hoverable ? 'hover:shadow-lg hover:scale-105' : '';
  
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all duration-300 ${hoverClass} ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}
