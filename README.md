# Student Attendance Web Application

A comprehensive web-based student attendance management system built with React, TypeScript, and Material-UI. This application provides all the features of the mobile Student Attendance App in a modern web interface.

## 🚀 Features

### Core Functionality
- **Student Management**: Add, edit, and delete student records
- **Attendance Tracking**: Mark daily attendance (present, absent, late)
- **Assessment Management**: Record and track student assessment marks
- **Offline Support**: Data stored locally when no internet connection
- **Data Synchronization**: Automatic sync when connection is restored

### Authentication & Security
- **User Authentication**: Secure login with username/password
- **Role-Based Access**: Admin and Trainer roles with different permissions
- **Group Management**: Organize students into groups by year
- **Data Segregation**: Trainers can only access data for their assigned groups

### Admin Features
- **User Management**: Create, edit, and delete trainer accounts
- **Group Management**: Create and manage student groups
- **System Statistics**: View comprehensive analytics and reports
- **Data Export**: Export all data for backup and analysis

## 🛠 Technical Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **State Management**: React Context API
- **Local Storage**: Browser localStorage
- **Date Handling**: Day.js with MUI Date Pickers
- **Data Grid**: MUI X Data Grid

### Development Tools
- **Build Tool**: Create React App
- **TypeScript**: Full type safety
- **ESLint**: Code linting and style enforcement

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
cd "C:\Users\ahmed\Documents\python app\StudentAttendanceApp\site"
npm install
```

### 2. Start Development Server
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

### 3. Build for Production
```bash
npm run build
```

## 🔐 Production Login

### Available Accounts
- **Admin**: `admin` / `admin123`
- **Trainer 1**: `trainer1` / `trainer123` (Groups 1-3, Years 1-2)
- **Trainer 2**: `trainer2` / `trainer123` (Groups 4-6, Years 2-3)
- **Trainer 3**: `trainer3` / `trainer123` (Groups 7-9, Years 3-4)

**Note**: You can create additional trainer accounts through the Admin Panel. Each trainer is assigned to specific groups and years for data segregation.

## 📱 Application Features

### Dashboard
- Overview of all system statistics
- Quick access to key metrics
- Recent activity summary

### Student Management
- Add, edit, and delete students
- Filter by year and group
- Bulk import from Excel (planned)
- Export to Excel (planned)

### Attendance Tracking
- Mark attendance for specific dates
- Filter by year and group
- Real-time attendance summary
- Visual status indicators

### Assessment Management
- Record assessment scores
- Multiple assessment types (Exam, Quiz, Assignment, Project, Presentation)
- View saved assessment history
- Calculate percentages and grades

### Admin Panel
- User management (Admin only)
- Group management
- System statistics
- Data overview

### Data Synchronization
- Offline-first design
- Automatic sync when online
- Manual sync option
- Connection status monitoring

## 🎨 User Interface

### Design System
- **Material Design**: Consistent with Google's design language
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Automatic theme detection
- **Accessibility**: Screen reader support and keyboard navigation

### Navigation
- **Sidebar Navigation**: Easy access to all features
- **Breadcrumbs**: Clear navigation hierarchy
- **Role-based Menu**: Different options for admins and trainers

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_VERSION=1.0.0
```

### Customization
- **Theme**: Modify colors and styling in `src/App.tsx`
- **API Endpoints**: Update service files in `src/services/`
- **Data Models**: Modify types in `src/types/index.ts`

## 📊 Data Structure

### Students
```typescript
{
  id: string;
  name: string;
  studentId: string;
  email?: string;
  phone?: string;
  year: number; // 1-6
  groupId: string;
  createdAt: string;
  updatedAt: string;
}
```

### Groups
```typescript
{
  id: string;
  name: string;
  year: number; // 1-6
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Attendance Records
```typescript
{
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  timestamp: string;
  synced: boolean;
  trainerId: string;
  year: number;
  groupId: string;
  notes?: string;
}
```

### Assessment Records
```typescript
{
  id: string;
  studentId: string;
  assessmentName: string;
  assessmentType: 'exam' | 'quiz' | 'assignment' | 'project' | 'presentation';
  score: number;
  maxScore: number;
  date: string;
  year: number;
  groupId: string;
  notes?: string;
  timestamp: string;
  synced: boolean;
  trainerId: string;
}
```

## 🔒 Security Features

- **Password Hashing**: Secure password storage
- **JWT Authentication**: Token-based authentication
- **Role-Based Access**: Different permissions for admins and trainers
- **Data Segregation**: Trainers can only access their assigned groups
- **Input Validation**: All user inputs are validated
- **Secure Storage**: Sensitive data stored securely

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Static Hosting
The built files in the `build` folder can be deployed to:
- **Netlify**: Drag and drop the build folder
- **Vercel**: Connect your GitHub repository
- **AWS S3**: Upload build files to S3 bucket
- **GitHub Pages**: Use GitHub Actions for deployment

### Environment Configuration
For production deployment:
1. Set up environment variables
2. Configure API endpoints
3. Enable HTTPS
4. Set up proper CORS policies

## 🐛 Troubleshooting

### Common Issues

**"Module not found" errors**
- Run `npm install` to install dependencies
- Clear npm cache: `npm cache clean --force`

**Build errors**
- Check TypeScript errors: `npm run build`
- Verify all imports are correct
- Ensure all dependencies are installed

**Authentication issues**
- Clear browser localStorage
- Check if demo accounts are working
- Verify user permissions

### Getting Help
1. Check the browser console for error messages
2. Verify all dependencies are installed
3. Ensure Node.js version is 16 or higher
4. Try clearing browser cache and localStorage

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Check the troubleshooting section
- Review the code comments
- Create an issue in the repository

---

**Note**: This is a demonstration application. For production use, consider implementing additional security measures, using a proper database, and following security best practices.




