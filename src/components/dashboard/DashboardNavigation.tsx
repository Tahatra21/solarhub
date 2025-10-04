import React from 'react';
import { 
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';

interface NavigationItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  priority: number;
}

interface DashboardNavigationProps {
  onNavigate: (href: string) => void;
  currentSection?: string;
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({ 
  onNavigate, 
  currentSection = 'overview' 
}) => {
  const navigationItems: NavigationItem[] = [
    {
      id: 'lifecycle',
      title: 'Product Lifecycle',
      description: 'Monitoring tahapan produk',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'from-cool-sky/60 to-pastel-blue/60 dark:from-cool-sky/30 dark:to-pastel-blue/30 text-vibrant-blue dark:text-cool-sky border-pastel-blue/40 dark:border-cool-sky/60',
      href: '/admin/lifecycle',
      priority: 1
    },
    {
      id: 'crjr',
      title: 'CR/JR Monitoring',
      description: 'Change & Job Request',
      icon: <Zap className="w-5 h-5" />,
      color: 'from-warm-honey/60 to-warm-apricot/60 dark:from-warm-honey/30 dark:to-warm-apricot/30 text-warm-gold dark:text-warm-honey border-warm-apricot/40 dark:border-warm-honey/60',
      href: '/admin/crjr',
      priority: 2
    },
    {
      id: 'license',
      title: 'License Monitoring',
      description: 'Software License Management',
      icon: <Shield className="w-5 h-5" />,
      color: 'from-vibrant-mint/60 to-dreamy-mint/60 dark:from-vibrant-mint/30 dark:to-dreamy-mint/30 text-vibrant-teal dark:text-vibrant-mint border-dreamy-mint/40 dark:border-vibrant-mint/60',
      href: '/admin/license',
      priority: 3
    }
  ];

  return (
    <div className="bg-neutral-cream-soft/70 dark:bg-muted-slate/70 rounded-2xl shadow-sm border border-neutral-beige-light/50 dark:border-muted-periwinkle/50 p-6 mb-8 space-y-6 backdrop-blur-sm">
      {/* Section Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center space-y-3 sm:space-y-0 sm:space-x-4">
        {navigationItems.map((item, index) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                const element = document.getElementById(`section-${item.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={`group flex items-center space-x-3 px-5 py-3 rounded-2xl transition-all duration-300 w-full sm:w-auto justify-center border-2 ${
                isActive
                  ? `bg-gradient-to-r ${item.color} shadow-sm`
                  : 'bg-slate-50 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
            >
              <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
              <span className="text-sm font-semibold whitespace-nowrap">{item.title}</span>
              {isActive && (
                <div className="w-2 h-2 bg-current rounded-full animate-pulse flex-shrink-0 opacity-70"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardNavigation;