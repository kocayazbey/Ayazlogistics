import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export interface CRUDModalProps<T = any> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  mode: 'create' | 'edit' | 'view';
  data?: T;
  fields: FieldConfig[];
  onSubmit: (data: T) => Promise<void>;
  onDelete?: () => Promise<void>;
  loading?: boolean;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'date' | 'password';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: (value: any) => string | null;
}

export function CRUDModal<T extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  mode,
  data,
  fields,
  onSubmit,
  onDelete,
  loading = false,
}: CRUDModalProps<T>) {
  const [formData, setFormData] = useState<T>({} as T);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (data && mode !== 'create') {
      setFormData(data);
    } else {
      // Initialize with empty values
      const initialData = {} as T;
      fields.forEach(field => {
        initialData[field.key] = '' as any;
      });
      setFormData(initialData);
    }
    setErrors({});
  }, [data, mode, fields]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const value = formData[field.key];

      // Required validation
      if (field.required && (!value || value.toString().trim() === '')) {
        newErrors[field.key] = `${field.label} is required`;
        return;
      }

      // Custom validation
      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          newErrors[field.key] = error;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onSubmit(formData);
      onOpenChange(false);
      toast({
        title: 'Success',
        description: `${title} ${mode === 'create' ? 'created' : 'updated'} successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${mode} ${title.toLowerCase()}`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      await onDelete();
      onOpenChange(false);
      toast({
        title: 'Success',
        description: `${title} deleted successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete ${title.toLowerCase()}`,
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));

    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const renderField = (field: FieldConfig) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];
    const isReadOnly = mode === 'view';

    const commonProps = {
      id: field.key,
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleInputChange(field.key, e.target.value),
      placeholder: field.placeholder,
      disabled: loading || isReadOnly,
      className: error ? 'border-red-500' : '',
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={4}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleInputChange(field.key, newValue)}
            disabled={loading || isReadOnly}
          >
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            onChange={(e) => handleInputChange(field.key, Number(e.target.value))}
          />
        );

      case 'password':
        return (
          <Input
            {...commonProps}
            type="password"
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            type={field.type}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 py-4">
            {fields.map(field => (
              <div key={field.key} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={field.key} className="text-right">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <div className="col-span-3">
                  {renderField(field)}
                  {error && (
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            {mode === 'view' ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                {onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    Delete
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
