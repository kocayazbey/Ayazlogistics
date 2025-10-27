import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text',
    label,
    error,
    help,
    icon,
    iconPosition = 'left',
    size = 'md',
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-4 py-3 text-base',
    };

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };

    const baseClasses = cn(
      'block w-full border rounded-md shadow-sm transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:bg-secondary-50 disabled:text-secondary-500 disabled:cursor-not-allowed',
      sizes[size],
      error
        ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
        : 'border-secondary-300 focus:border-primary-500 focus:ring-primary-500',
      icon && iconPosition === 'left' && 'pl-10',
      icon && iconPosition === 'right' && 'pr-10',
      className
    );

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-secondary-700"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className={cn('text-secondary-400', iconSizes[size])}>
                {icon}
              </span>
            </div>
          )}
          
          <input
            id={inputId}
            type={type}
            className={baseClasses}
            ref={ref}
            {...props}
          />
          
          {icon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className={cn('text-secondary-400', iconSizes[size])}>
                {icon}
              </span>
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-error-600">
            {error}
          </p>
        )}
        
        {help && !error && (
          <p className="text-sm text-secondary-500">
            {help}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    label,
    error,
    help,
    size = 'md',
    id,
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-4 py-3 text-base',
    };

    const baseClasses = cn(
      'block w-full border rounded-md shadow-sm transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:bg-secondary-50 disabled:text-secondary-500 disabled:cursor-not-allowed',
      'resize-vertical',
      sizes[size],
      error
        ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
        : 'border-secondary-300 focus:border-primary-500 focus:ring-primary-500',
      className
    );

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-secondary-700"
          >
            {label}
          </label>
        )}
        
        <textarea
          id={textareaId}
          className={baseClasses}
          ref={ref}
          {...props}
        />
        
        {error && (
          <p className="text-sm text-error-600">
            {error}
          </p>
        )}
        
        {help && !error && (
          <p className="text-sm text-secondary-500">
            {help}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  help?: string;
  size?: 'sm' | 'md' | 'lg';
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    label,
    error,
    help,
    size = 'md',
    options,
    placeholder,
    id,
    ...props 
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-4 py-3 text-base',
    };

    const baseClasses = cn(
      'block w-full border rounded-md shadow-sm transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:bg-secondary-50 disabled:text-secondary-500 disabled:cursor-not-allowed',
      sizes[size],
      error
        ? 'border-error-300 focus:border-error-500 focus:ring-error-500'
        : 'border-secondary-300 focus:border-primary-500 focus:ring-primary-500',
      className
    );

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-secondary-700"
          >
            {label}
          </label>
        )}
        
        <select
          id={selectId}
          className={baseClasses}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {error && (
          <p className="text-sm text-error-600">
            {error}
          </p>
        )}
        
        {help && !error && (
          <p className="text-sm text-secondary-500">
            {help}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Input, Textarea, Select };
