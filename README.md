# 🌞 SolarHub - Product Lifecycle Management System

A comprehensive Product Lifecycle Management (PLM) system built with Next.js 15, TypeScript, and PostgreSQL for PLN ICON+.

## 🚀 Features

- **📊 Dashboard Analytics** - Comprehensive product lifecycle insights
- **👥 User Management** - Complete user administration system
- **🔔 Smart Notifications** - License expiry notifications with daily reset
- **📈 Lifecycle Analysis** - Product transition matrix and speed analysis
- **📋 Product Catalog** - Full product management with categories and segments
- **🔍 Monitoring Tools** - CR/JR and License monitoring systems
- **📱 Responsive Design** - Modern UI with dark/light theme support

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4.0
- **Database**: PostgreSQL
- **Authentication**: JWT with Jose
- **Charts**: ApexCharts, Chart.js
- **Icons**: Lucide React
- **Date Handling**: date-fns, react-datepicker

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tahatra21/solarhub.git
   cd solarhub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🏗️ Project Structure

```
solarhub/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── admin/          # Admin dashboard pages
│   │   ├── api/            # API routes
│   │   └── login/          # Authentication pages
│   ├── components/         # React components
│   │   ├── dashboard/     # Dashboard components
│   │   ├── charts/        # Chart components
│   │   ├── form/          # Form components
│   │   └── ui/            # UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Database and utilities
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Helper functions
├── docs/                  # Documentation
├── scripts/               # Utility scripts
└── public/               # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Feature Documentation](./docs/)
- [Performance Optimization](./docs/PERFORMANCE_OPTIMIZATION.md)

## 🎯 Key Features

### Dashboard
- Real-time product lifecycle analytics
- CR/JR and License monitoring
- Interactive charts and visualizations

### User Management
- Role-based access control
- User profile management
- Activity logging

### Notification System
- Smart license expiry notifications
- Daily reset functionality
- 30-day expiry filtering

### Product Lifecycle
- Transition matrix analysis
- Speed analysis
- Distribution tracking

## 🔒 Security

- JWT-based authentication
- Role-based authorization
- Input validation and sanitization
- SQL injection protection

## 📈 Performance

- Optimized bundle size
- Code splitting
- Image optimization
- Database query optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Developer**: Tahatra21
- **Organization**: PLN ICON+

## 📞 Support

For support and questions, please contact the development team.

---

**SolarHub** - Empowering Product Lifecycle Management 🌞