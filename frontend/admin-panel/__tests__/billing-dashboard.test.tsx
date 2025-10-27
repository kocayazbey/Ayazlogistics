import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BillingDashboard from '../src/app/billing/page';

describe('BillingDashboard', () => {
  it('renders billing metrics', () => {
    render(<BillingDashboard />);
    
    expect(screen.getByText('Billing & Revenue')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Outstanding Invoices')).toBeInTheDocument();
  });

  it('displays recent invoices table', () => {
    render(<BillingDashboard />);
    
    expect(screen.getByText('Recent Invoices')).toBeInTheDocument();
    expect(screen.getByText('Invoice ID')).toBeInTheDocument();
  });

  it('shows pricing strategies', () => {
    render(<BillingDashboard />);
    
    expect(screen.getByText('Pricing Strategies')).toBeInTheDocument();
    expect(screen.getByText('Peak Season Pricing')).toBeInTheDocument();
    expect(screen.getByText('Volume Discounts')).toBeInTheDocument();
  });
});

