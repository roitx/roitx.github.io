# Welcome to Your Miaoda Project
Miaoda Application Link URL
    URL:https://medo.dev/projects/app-8miaxso1s35t

# ROITX MANAGEMENT

A professional, high-end Full-Stack Web Application for business management, supporting multiple business categories including Gym, Library, Academy, and Store.

## Features

### 🔐 Authentication System
- User registration with custom fields (Full Name, Email, Business Category)
- Email + Password authentication
- Password strength validation
- Role-based access control (Admin and Manager roles)
- Secure session management
- First registered user automatically becomes admin

### 📊 Dashboard
- Live KPI statistics with animated counters:
  - Total Members count
  - Pending Dues amount
  - Total Revenue
- Interactive revenue trend line chart
- Revenue distribution pie chart
- Real-time data updates from Supabase

### 👥 Member Directory Management
- Complete member registration flow with validation
- Member information fields:
  - Full Name (required)
  - Mobile Number (required, +91 prefix, 10-digit validation)
  - Email (optional)
  - Membership type, dates, and payment details
  - Notes
- QR Code generation for each member
- Duplicate member checking
- Advanced search and filtering
- Member profile viewing and editing
- Member deletion with confirmation
- WhatsApp integration for one-click messaging

### 💰 Finance Hub
- Detailed transaction history with sorting and filtering
- Transaction management (add, view, delete)
- Monthly and yearly revenue analytics
- Revenue trend visualization
- Payment status tracking
- CSV export functionality

### ⚙️ Settings & Admin Controls
- Profile management:
  - Edit name and email
  - View business category and role
- Theme toggle (Light/Dark mode):
  - Light Mode: Ultra-Glassy Apple Style with glassmorphism
  - Dark Mode: Deep Space Cosmic theme with animated gradients
- Font size adjustment
- Notification preferences
- Data management with "Wipe All Data" functionality (double confirmation)

### 👑 Admin Panel
- User role management
- View all registered users
- Change user roles (Admin/Manager)
- User statistics dashboard

### 🎨 UI/UX Design
- **Light Mode**: Ultra-Glassy Apple Style with glassmorphism effects
- **Dark Mode**: Deep Space Cosmic theme with smooth gradients
- Desktop-first responsive design with mobile adaptation
- Sidebar navigation (desktop) + Bottom tab navigation (mobile)
- Smooth animations and transitions
- Hover effects and loading states
- Professional color scheme with semantic design tokens

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (PostgreSQL with real-time capabilities)
- **Authentication**: Supabase Auth
- **Charts**: Chart.js + react-chartjs-2
- **QR Codes**: qrcode library
- **Routing**: React Router v7
- **Theme**: next-themes
- **Forms**: React Hook Form + Zod validation
- **Notifications**: Sonner (toast notifications)
- **Icons**: Lucide React
- **Build Tool**: Vite

## Database Schema

### Tables
- **profiles**: User profiles with business category and role
- **members**: Member directory with contact and membership details
- **transactions**: Financial transactions with member references
- **notifications**: System notifications for users
- **settings**: User preferences and app settings

### Security
- Row Level Security (RLS) policies for all tables
- Admin and Manager role-based access
- Secure authentication with Supabase Auth
- Data isolation per user

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Supabase account (automatically configured)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. The application is pre-configured with Supabase. Environment variables are already set up.

3. Run linting to verify setup:
```bash
npm run lint
```

### First User Setup

1. Register the first account - this user will automatically become an admin
2. Subsequent users will be assigned the "manager" role by default
3. Admins can change user roles from the Admin panel

## Usage Guide

### For Administrators

1. **Dashboard**: View overall business statistics and revenue trends
2. **Members**: Add, edit, and manage member records
3. **Finance**: Track transactions and analyze revenue
4. **Settings**: Customize app preferences and manage data
5. **Admin Panel**: Manage user roles and permissions

### For Managers

1. **Dashboard**: View business statistics
2. **Members**: Manage member directory
3. **Finance**: Track and record transactions
4. **Settings**: Customize personal preferences

### Key Features Usage

#### Adding a Member
1. Navigate to Members page
2. Click "Add Member" button
3. Fill in required fields (Name, Mobile Number)
4. Add optional details (Email, Membership Type, Payment Info)
5. Click "Add Member" to save

#### Generating QR Codes
1. Go to Members page
2. Click "QR" button on any member card
3. View the generated QR code
4. Click "Download QR Code" to save

#### WhatsApp Integration
1. Click "WhatsApp" button on any member card
2. Opens WhatsApp with pre-filled message
3. Customize message and send

#### Exporting Data
1. Go to Finance page
2. Click "Export CSV" button
3. CSV file downloads with all transaction data

#### Theme Switching
1. Go to Settings page
2. Click Light or Dark button under Appearance
3. Theme changes instantly

## Project Structure

```
src/
├── components/
│   ├── dashboard/       # Dashboard components (KPICard, Charts)
│   ├── finance/         # Finance components (TransactionTable, Dialog)
│   ├── layouts/         # Layout components (AppLayout, Sidebar, Header)
│   ├── members/         # Member components (MemberCard, Dialog, QRCode)
│   ├── common/          # Common components (RouteGuard)
│   └── ui/              # shadcn/ui components
├── contexts/            # React contexts (AuthContext)
├── db/                  # Database layer (api.ts, supabase.ts)
├── pages/               # Page components
├── types/               # TypeScript type definitions
├── lib/                 # Utility functions
├── routes.tsx           # Route configuration
├── App.tsx              # Main app component
└── index.css            # Global styles and theme
```

## Security Features

- Email + Password authentication with validation
- Row Level Security (RLS) on all database tables
- Role-based access control (Admin/Manager)
- Secure session management
- Input validation and sanitization
- Protected routes with authentication guards

## Performance Optimizations

- Lazy loading for images and components
- Efficient data fetching with Supabase
- Optimized re-renders with React hooks
- Minimal bundle size with tree-shaking
- Responsive images and assets

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

© 2026 ROITX MANAGEMENT. All rights reserved.

## Support

For issues or questions, please contact the development team.

---

**Built with ❤️ using React, TypeScript, Tailwind CSS, and Supabase**
