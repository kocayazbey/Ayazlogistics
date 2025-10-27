# AyazLogistics Admin Panel

AI-powered logistics management platform admin panel built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

### Core Business Logic Modules
- **Intelligent Inventory Management** - AI-powered ABC/XYZ analysis, demand forecasting, and optimization
- **Dynamic Route Optimization** - Real-time traffic/weather data integration with multi-algorithm optimization
- **Customer Segmentation** - AI-driven customer analysis and personalization
- **Risk Assessment** - Comprehensive risk management and mitigation strategies
- **Performance Metrics** - Advanced analytics and KPI tracking
- **Automated Decision Engine** - AI-powered business rules and decision automation

### Technical Features
- **Modern React 18** with TypeScript
- **Responsive Design** - Mobile-first approach
- **iOS-style UI** - Clean, modern interface
- **Real-time Data** - Live updates and monitoring
- **AI Integration** - Machine learning powered insights
- **Interactive Dashboards** - Rich data visualization
- **Role-based Access** - Secure admin controls

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **State**: React Hooks
- **Build**: Vite + TypeScript

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── layout/          # Layout components (Sidebar, Header, etc.)
│   ├── intelligent-inventory/
│   ├── route-optimization/
│   ├── customer-segmentation/
│   ├── risk-assessment/
│   ├── performance-metrics/
│   └── automated-decision-engine/
├── pages/               # Page components
├── styles/              # Global styles and CSS
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#3b82f6)
- **Secondary**: Gray (#64748b)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)
- **Info**: Blue (#3b82f6)

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700
- **Responsive**: Mobile-first scaling

### Components
- **Cards**: Soft shadows, rounded corners
- **Buttons**: Multiple variants (primary, secondary, outline, ghost)
- **Badges**: Status indicators and labels
- **Progress**: Animated progress bars
- **Tabs**: Interactive tab navigation

## 📱 Responsive Design

- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+
- **Large Desktop**: 1280px+

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_APP_NAME=AyazLogistics Admin
VITE_APP_VERSION=1.0.0
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Netlify

```bash
# Build
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

## 📊 Performance

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **Bundle Size**: Optimized with Vite
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Unused code elimination
- **Image Optimization**: WebP support with fallbacks

## 🔒 Security

- **XSS Protection**: React's built-in XSS protection
- **CSRF Protection**: API token validation
- **Content Security Policy**: Strict CSP headers
- **Input Validation**: Zod schema validation
- **Type Safety**: Full TypeScript coverage

## 🧪 Testing

```bash
# Run tests (when implemented)
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📈 Analytics

- **Performance Monitoring**: Built-in performance metrics
- **Error Tracking**: Error boundary implementation
- **User Analytics**: Privacy-focused analytics
- **Real-time Monitoring**: Live system health

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@ayazlogistics.com or join our Slack channel.

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Real-time collaboration features
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Offline support (PWA)
- [ ] Advanced AI features
- [ ] Integration marketplace

---

**Built with ❤️ by the AyazLogistics Team**