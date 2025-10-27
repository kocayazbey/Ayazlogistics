import React from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export default function Input({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  required = false,
  fullWidth = false,
  icon,
  className = ''
}: InputProps) {
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <div className={`space-y-2 ${widthClass}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${icon ? 'pl-10' : ''} ${widthClass} ${className}`}
        />
      </div>
    </div>
  );
}
