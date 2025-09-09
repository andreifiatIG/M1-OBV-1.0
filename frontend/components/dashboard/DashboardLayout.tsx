import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  FileText,
  Shield,
} from 'lucide-react';

// Define the navigation items
export const navigationItems = [
  { name: 'Dashboard', icon: LayoutDashboard, view: 'overview' },
  { name: 'Villa Management', icon: Building2, view: 'villas' },
  { name: 'Owner Management', icon: Users, view: 'owners' },
  { name: 'Staff Management', icon: Briefcase, view: 'staff' },
  { name: 'Document Management', icon: FileText, view: 'documents' },
  { name: 'Admin', icon: Shield, view: 'admin' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeView, onViewChange }) => {
  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 p-4">
        <div className="h-full glass-card-white-teal rounded-2xl p-4 flex flex-col shadow-lg">
          <div className="flex items-center mb-8 px-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-wider">ILS OS</h1>
          </div>
          <nav className="flex-grow">
            <ul>
              {navigationItems.map((item) => (
                <li key={item.name}>
                  <button
                    onClick={() => onViewChange(item.view)}
                    className={`
                      flex items-center w-full px-4 py-3 my-1 text-sm font-medium rounded-lg transition-all duration-200
                      ${
                        activeView === item.view
                          ? 'bg-teal-500/20 text-teal-700 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-200/50'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
