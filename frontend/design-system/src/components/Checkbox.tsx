import React from 'react';

interface CheckboxProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked = false,
  onChange,
  disabled = false,
}) => {
  return (
    <label className="inline-flex items-center cursor-pointer group">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
      />
      <div className="relative w-5 h-5 rounded-md border-2 border-gray-300 bg-white peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all group-hover:border-blue-400 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed">
        <svg
          className={`absolute inset-0 w-full h-full text-white transition-opacity ${
            checked ? 'opacity-100' : 'opacity-0'
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      {label && (
        <span className="ml-3 text-sm text-gray-700 select-none peer-disabled:opacity-50">
          {label}
        </span>
      )}
    </label>
  );
};

