import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bookmark, History, FileText } from 'lucide-react';
import { createPageUrl } from './utils';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  const tabs = [
    { name: 'Home', label: 'ホーム', icon: Home, path: createPageUrl('Home') },

    { name: 'Drafts', label: '旗路', icon: FileText, path: createPageUrl('Drafts') },
    { name: 'History', label: '履歴', icon: History, path: createPageUrl('History') },
    { name: 'MySaved', label: '保存', icon: Bookmark, path: createPageUrl('MySaved') }
  ];
  
  const isActiveTab = (tabName) => {
    return currentPageName === tabName;
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content */}
      <div className="w-full">
        {children}
      </div>
      
      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-md mx-auto flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActiveTab(tab.name);
            
            return (
              <Link
                key={tab.name}
                to={tab.path}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                  active 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-6 h-6 mb-1 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className={`text-xs ${active ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}