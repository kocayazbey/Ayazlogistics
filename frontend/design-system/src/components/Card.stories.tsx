import type { Meta, StoryObj } from '@storybook/react';
import Card from './Card';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    hoverable: {
      control: 'boolean',
      description: 'Enable hover effect',
    },
    bordered: {
      control: 'boolean',
      description: 'Show border',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2">Card Title</h3>
        <p className="text-gray-600">Card content goes here. This is a basic card component.</p>
      </div>
    ),
  },
};

export const Hoverable: Story = {
  args: {
    hoverable: true,
    children: (
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2">Hoverable Card</h3>
        <p className="text-gray-600">Hover over me to see the effect!</p>
      </div>
    ),
  },
};

export const WithStats: Story = {
  args: {
    hoverable: true,
    children: (
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">₺2.4M</p>
            <p className="mt-1 text-sm text-green-600">+12.5% vs last month</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
            💰
          </div>
        </div>
      </div>
    ),
  },
};

export const WithTable: Story = {
  args: {
    children: (
      <div>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold">Recent Orders</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="font-medium">Order #{i}</span>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
};

