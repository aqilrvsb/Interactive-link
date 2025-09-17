# Interactive Link - Web Development Platform

A modern web-based code editor and website builder with real-time preview, project management, and cloud deployment capabilities.

## 🚀 Features

- **Code Editor**: Monaco-based editor with syntax highlighting
- **Real-time Preview**: See your HTML/CSS/JS changes instantly
- **Project Management**: Save, organize, and manage multiple projects
- **Version Control**: Track changes with automatic versioning
- **Cloud Storage**: Supabase integration for data persistence
- **User Authentication**: Secure login and user-specific workspaces
- **File Management**: Upload and manage project assets
- **Public Sharing**: Generate shareable links for your projects

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Editor**: Monaco Editor
- **Backend**: Supabase (Auth, Database, Storage)
- **Build Tool**: Vite
- **Deployment**: Railway (auto-deploy on push)

## 📋 Prerequisites

- Node.js 18+ and npm
- Git
- Supabase account (for backend services)

## 🏃‍♂️ Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/aqilrvsb/Interactive-link.git
cd Interactive-link-main

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_anon_key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
DATABASE_URL="postgresql://connection_string"
```

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL migrations from `FINAL_SQL_FOR_SUPABASE.sql`
3. Create storage bucket named `project-files`
4. Set up RLS policies as needed

## 🚢 Deployment

### Railway Deployment (Automatic)

This project is configured for automatic deployment on Railway:

1. Push changes to the main branch
2. Railway automatically builds and deploys
3. Access your app at your Railway URL

### Manual Deployment

The project includes a `railway.json` configuration:
- Build command: `npm install && npm run build`
- Start command: `npm run preview`

## 📁 Project Structure

```
Interactive-link-main/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and helpers
│   └── hooks/          # Custom React hooks
├── public/             # Static assets
├── dist/               # Production build output
└── supabase/          # Database migrations
```

## 🔑 Key Features Explained

### Website Builder
- Full-featured HTML/CSS/JS editor
- Live preview with hot reload
- Save projects to cloud
- Version history tracking

### Project Management
- Create unlimited projects
- Organize with folders
- Search and filter projects
- Share projects publicly

### User System
- Secure authentication
- User profiles with sequential IDs
- Personal workspaces
- Project ownership

## 🐛 Troubleshooting

### Build Issues
- Ensure Node.js 18+ is installed
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run lint`

### Database Connection
- Verify Supabase credentials in `.env`
- Check if tables are created (run migrations)
- Ensure RLS policies allow operations

## 📝 Recent Updates

- ✅ Fixed async/await build errors in WebsiteBuilder.tsx
- ✅ Removed ngrok dependency - app runs directly on localhost
- ✅ Updated to use port 8080 for development
- ✅ Improved error handling in file operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is private. All rights reserved.

## 🔗 Links

- **GitHub**: https://github.com/aqilrvsb/Interactive-link.git
- **Live Demo**: [Your Railway URL]
- **Lovable Project**: https://lovable.dev/projects/57d3e522-175a-4838-94ed-882d907f460f

## 💡 Support

For issues or questions, please open an issue on GitHub.

---
Built with ❤️ using React, TypeScript, and Supabase