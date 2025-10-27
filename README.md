# AyazLogistics - Comprehensive Logistics Management System

## 🚀 Overview

AyazLogistics is a comprehensive, enterprise-grade logistics management system built with modern technologies and best practices. The system provides end-to-end logistics solutions with advanced security, monitoring, and scalability features.

## ✨ Key Features

### 🔒 Security & Compliance
- **Multi-tenant Architecture** with strict tenant isolation
- **SBOM Generation** and container image signing (Cosign)
- **OWASP CRS WAF** protection
- **PII Redaction** and secure audit logging
- **Field-level Encryption** for sensitive data
- **Content Security Policy** (CSP) enforcement
- **TLS Certificate Automation** with Let's Encrypt

### 📊 Observability & Monitoring
- **LGTM Stack** (Loki, Grafana, Tempo, Prometheus)
- **Request-ID Middleware** for distributed tracing
- **SLO Monitoring** with error budgets
- **Prometheus RED/USE** alerting
- **Sentry Integration** for frontend monitoring

### 🛡️ Resilience & Performance
- **Circuit Breaker** patterns with health endpoints
- **Read-replica Routing** and database failover
- **Rate Limiting** for login and write operations
- **E2E Stability Testing** for critical flows
- **K6 Load Testing** with SLO gates

### 🧪 Quality Assurance
- **Lighthouse CI** and Web Vitals budgets
- **DAST Security Scanning** (OWASP ZAP)
- **Stryker Mutation Testing**
- **Pact Contract Testing**
- **Coverage Thresholds** enforcement
- **Husky Pre-commit** hooks
- **Conventional Commits** validation

### 📈 Data Management
- **Deterministic Seed Data** for development/testing
- **PostgreSQL RLS** policies
- **Data Quality/Lineage** pipelines
- **Backup Encryption** and key rotation
- **API Quotas** (tenant and endpoint-based)

### 🌐 Internationalization
- **Pseudo-localization** testing
- **i18n Coverage** metrics

### 🚀 Advanced Features
- **Temporal/Saga Orchestrator** PoC
- **Feature Flags** (Unleash/LaunchDarkly)
- **OpenAPI TypeScript** type generation
- **Regional Failover** runbooks
- **Active-Active Disaster Recovery** testing

### ⚡ Real-time Enhancements
- **WebSocket Real-time Updates** (replaces HTTP polling)
- **Smooth Location Animations** (60fps vehicle movement)
- **Location Queue System** (asynchronous batch processing)
- **Route Optimization Caching** (Redis-backed with TTL)
- **Traffic & Weather Integration** (API-ready)
- **Advanced Fuel Calculation** (multi-factor algorithm)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AyazLogistics System                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js)  │  Mobile Apps  │  Admin Panel       │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway (NestJS)                     │
├─────────────────────────────────────────────────────────────┤
│  Security  │  Observability  │  Resilience  │  Testing     │
│  Data      │  Feature Flags  │  Infrastructure │  Dev      │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Redis  │  LGTM Stack  │  Monitoring      │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Backend
- **NestJS** - Enterprise Node.js framework
- **PostgreSQL** - Primary database with RLS
- **Redis** - Caching and session storage
- **Drizzle ORM** - Type-safe database access

### Frontend
- **Next.js** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Sentry** - Error monitoring

### DevOps & Infrastructure
- **Docker** - Containerization
- **Kubernetes** - Orchestration
- **GitHub Actions** - CI/CD
- **Prometheus/Grafana** - Monitoring
- **Loki** - Log aggregation
- **Tempo** - Distributed tracing

### Security
- **Cosign** - Container signing
- **OWASP ZAP** - Security scanning
- **CSP** - Content Security Policy
- **WAF** - Web Application Firewall

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- PostgreSQL 16+
- Redis 7+
- Docker (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ayazlogistics/ayazlogistics.git
cd ayazlogistics
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp env.example .env
# Edit .env with your configuration
```

4. **Set up the database**
```bash
npm run db:migrate
```

5. **Start the development server**
```bash
npm run start:dev
```

6. **Access the application**
- API: http://localhost:3000
- API Documentation: http://localhost:3000/api
- Admin Panel: http://localhost:3001

## 📋 Available Scripts

### Development
```bash
npm run start:dev          # Start development server
npm run start:debug        # Start with debugging
npm run build              # Build for production
npm run start:prod         # Start production server
```

### Database
```bash
npm run db:generate        # Generate migrations
npm run db:migrate         # Run migrations
npm run db:push            # Push schema changes
npm run db:studio          # Open Drizzle Studio
```

### Testing
```bash
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run E2E tests
npm run test:integration   # Run integration tests
```

### Security & Quality
```bash
npm run sbom:generate      # Generate SBOM
npm run cosign:setup       # Setup Cosign
npm run security:scan      # Run security scan
npm run lint               # Run ESLint
npm run format             # Format code with Prettier
```

## 🔧 Configuration

### Environment Variables

Key environment variables for configuration:

```bash
# Application
NODE_ENV=development
PORT=3000
APP_NAME=AyazLogistics

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=ayazlogistics

# Security
JWT_SECRET=your-jwt-secret
AUDIT_ENCRYPTION_KEY=your-audit-key
FIELD_ENCRYPTION_KEY=your-field-key

# Monitoring
PROMETHEUS_ENDPOINT=http://localhost:9090
GRAFANA_ENDPOINT=http://localhost:3000
```

## 🏢 Enterprise Features

### Multi-tenancy
- Strict tenant isolation at all levels
- Tenant-specific data access controls
- Scalable multi-tenant architecture

### Security
- End-to-end encryption
- Audit logging with PII redaction
- Container image signing
- Security scanning in CI/CD

### Monitoring
- Comprehensive observability stack
- SLO monitoring with error budgets
- Distributed tracing
- Performance monitoring

### Quality Assurance
- Automated testing at all levels
- Security scanning
- Performance testing
- Mutation testing

## 📚 API Documentation

The API documentation is available at `/api` when running the application. It includes:

- **Security endpoints** - Authentication, authorization, audit
- **Observability endpoints** - Monitoring, metrics, alerts
- **Resilience endpoints** - Circuit breakers, health checks
- **Testing endpoints** - Quality assurance, load testing
- **Data endpoints** - Database, encryption, backup
- **Feature flag endpoints** - Feature management
- **Infrastructure endpoints** - Deployment, TLS
- **Development endpoints** - Tooling, i18n

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow conventional commit format
- Ensure all tests pass
- Maintain test coverage above 80%
- Run security scans before submitting
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- 📧 Email: support@ayazlogistics.com
- 📖 Documentation: [docs.ayazlogistics.com](https://docs.ayazlogistics.com)
- 🐛 Issues: [GitHub Issues](https://github.com/ayazlogistics/ayazlogistics/issues)

## 🎯 Roadmap

- [x] **Real-time WebSocket Integration** ✅
- [x] **Location Animation System** ✅
- [x] **Performance Optimization** ✅
- [x] **Route Caching System** ✅
- [x] **Location Queue Processing** ✅
- [x] **Traffic & Weather Integration** ✅
- [x] **Fuel Calculation Algorithm** ✅
- [ ] Machine Learning integration
- [ ] Blockchain supply chain tracking
- [ ] Advanced analytics dashboard
- [ ] Mobile app optimization
- [ ] Multi-region deployment
- [ ] Real traffic API integration (Google Maps/TomTom)
- [ ] Weather API integration (OpenWeatherMap)

---

**AyazLogistics** - Empowering logistics with technology 🚛📦