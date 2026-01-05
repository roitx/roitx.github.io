# ROITX MANAGEMENT Requirements Document

## 1. Application Overview

### 1.1 Application Name
ROITX MANAGEMENT

### 1.2 Application Description
A professional, high-end Full-Stack Web Application for business management, supporting multiple business categories including Gym, Library, Academy, and Store. The application provides comprehensive member management, financial tracking, analytics, and automated communication features.

### 1.3 Target Users
- Business Administrators
- Business Managers
- Business owners across different categories (Gym, Library, Academy, Store)
\n## 2. Core Features
\n### 2.1 Authentication System
- User registration with custom fields:\n  - Full Name (required)
  - Gmail (required, with validation)
  - Password (required, with strength validation)
  - Business Category (required, dropdown: Gym, Library, Academy, Store)
- Email verification process
- Password strength validation
- Role-based access control (Admin and Manager roles)
- Secure login/logout functionality
- Session management\n
### 2.2 Dashboard
- Display admin name and business type dynamically
- Live statistics display:
  - Total Members count
  - Pending Dues amount
  - Total Revenue\n- Animated KPI counters
- Growth Line Chart showing revenue trends
- Pie Chart for revenue distribution
- Real-time data updates

### 2.3 Member Directory Management
- Sequential registration flow:
  - Member details input form
  - Confirmation badge display
  - QR Code generation for each member
- Member information fields:
  - Full Name (required)
  - Mobile Number (required, fixed +91 prefix, 10-digit numeric validation)
  - Email (optional)\n  - Membership details\n  - Payment information
- Duplicate member checking
- Member search and filtering
- Member profile viewing and editing
- Member deletion with confirmation
- Automated alerts for incomplete information

### 2.4 WhatsApp Integration
- One-click automated fee reminder messages
- Batch messaging to multiple members
- Message template customization
- Send status tracking
\n### 2.5 Notifications System
- Real-time toast notifications for:
  - New member registrations
  - Payment confirmations
  - System errors
  - Data sync status
- Notification toggle in settings
\n### 2.6 Finance Hub
- Detailed transaction history\n- Transaction sorting and filtering
- Transaction search functionality
- Monthly revenue analytics
- Yearly revenue analytics
- Revenue trend lines
- Payment status tracking

### 2.7 Data Export
- CSV/Excel export for:\n  - Member list
  - Transaction records
- PDF invoice generation for individual members
- Bulk export options

### 2.8 Settings & Admin Controls
- Profile management:\n  - Editable admin information
  - Password change\n  - Business category update
- Cloud sync status indicator with real-time updates
- Data management:
  - Wipe All Data button with double confirmation
- App preferences:
  - Font size adjustment
  - Theme toggle (Light/Night mode)
  - Notification toggle

## 3. UI/UX Design Requirements

### 3.1 Responsive Design
- Desktop layout: Sidebar navigation\n- Mobile layout: Bottom-tab navigation
- Smooth transitions between layouts
- Touch-friendly interface for mobile devices
- Mobile-friendly gestures support

### 3.2 Theme System
- Light Mode:\n  - Ultra-Glassy Apple Style design
  - Glassmorphism UI elements
  - Clean and minimal aesthetic
- Night Mode:
  - Deep Space Cosmic theme\n  - Animated floating stars background
  - Smooth background gradients
- Theme toggle with smooth transition

### 3.3 Branding
- Logo display in sidebar/navbar:\n  - Use logo.jpg if available
  - Auto-generate animated gradient logo with admin's first letter if image unavailable
- Consistent brand colors throughout the application

### 3.4 Animations & Interactions
- Hover effects on interactive elements
- Subtle button animations
- Loading skeletons for data fetching
- Smooth page transitions
- Animated KPI counters
- Focus states for accessibility

### 3.5 Typography & Icons
- Font family: Outfit\n- Icon library: FontAwesome
- Consistent font sizing and hierarchy
\n## 4. Technical Requirements

### 4.1 Technology Stack
- Frontend: HTML5, Tailwind CSS, JavaScript (ES6)
- Database: Supabase (real-time cloud database)
- Charts: Chart.js\n- Authentication: Supabase Auth
\n### 4.2 Data Management
- Real-time cloud database integration with Supabase
- Offline mode with local persistence for:\n  - Member data
  - Transaction records
- Automatic data synchronization when online
- Data validation and error handling

### 4.3 Code Quality
- Modular architecture with reusable components:\n  - Cards\n  - Tables
  - Forms
  - Buttons
  - Modals
- Fully documented code with comments
- Modern JavaScript best practices (ES6+)
- Clean and maintainable code structure
- Ready for GitHub repository upload

### 4.4 Accessibility
- ARIA labels for screen readers
- Keyboard navigation support
- Focus states for all interactive elements
- Color contrast compliance
- Semantic HTML structure

### 4.5 Performance
- Optimized loading times
- Lazy loading for images and components
- Efficient data fetching strategies
- Minimal bundle size

## 5. Security Requirements
- Secure authentication flow
- Password encryption\n- Email verification
- Role-based access control
- Input validation and sanitization
- Protection against common vulnerabilities (XSS, CSRF)\n- Secure API communication

## 6. Deliverables
- Single professional-grade code file or modular structure
- Integrated HTML, Tailwind CSS, JavaScript, and Chart.js logic
- Supabase configuration and integration
- Comprehensive code comments and documentation
- README file with setup instructions
- Code following modern best practices and responsive design principles