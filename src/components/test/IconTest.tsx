"use client";

import React from 'react';
import { 
  GitBranch, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Zap,
  Target
} from 'lucide-react';

const IconTest: React.FC = () => {
  return (
    <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Icon Test</h2>
      
      <div className="grid grid-cols-5 gap-4">
        <div className="flex flex-col items-center p-4 border rounded-lg">
          <GitBranch className="w-8 h-8 text-blue-500 mb-2" />
          <span className="text-sm">GitBranch</span>
        </div>
        
        <div className="flex flex-col items-center p-4 border rounded-lg">
          <Zap className="w-8 h-8 text-yellow-500 mb-2" />
          <span className="text-sm">Zap</span>
        </div>
        
        <div className="flex flex-col items-center p-4 border rounded-lg">
          <Target className="w-8 h-8 text-green-500 mb-2" />
          <span className="text-sm">Target</span>
        </div>
        
        <div className="flex flex-col items-center p-4 border rounded-lg">
          <Clock className="w-8 h-8 text-orange-500 mb-2" />
          <span className="text-sm">Clock</span>
        </div>
        
        <div className="flex flex-col items-center p-4 border rounded-lg">
          <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
          <span className="text-sm">CheckCircle2</span>
        </div>
        
        <div className="flex flex-col items-center p-4 border rounded-lg">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <span className="text-sm">AlertCircle</span>
        </div>
        
        <div className="flex flex-col items-center p-4 border rounded-lg">
          <BarChart3 className="w-8 h-8 text-purple-500 mb-2" />
          <span className="text-sm">BarChart3</span>
        </div>
        
        <div className="flex flex-col items-center p-4 border rounded-lg">
          <Users className="w-8 h-8 text-indigo-500 mb-2" />
          <span className="text-sm">Users</span>
        </div>
        
        <div className="flex flex-col items-center p-4 border rounded-lg">
          <Calendar className="w-8 h-8 text-teal-500 mb-2" />
          <span className="text-sm">Calendar</span>
        </div>
        
        <div className="flex flex-col items-center p-4 border rounded-lg">
          <TrendingUp className="w-8 h-8 text-pink-500 mb-2" />
          <span className="text-sm">TrendingUp</span>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Test dalam container dengan background</h3>
        <div className="flex space-x-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="p-3 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl">
            <Target className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconTest;