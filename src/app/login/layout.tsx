"use client";

import ToastProvider from '@/components/toast/ToastProvider';
import { ThemeProvider } from "@/context/ThemeContext";
import React from "react";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>      
      <div className="relative p-6 bg-white z-1 sm:p-0">
        <ThemeProvider>
          <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col sm:p-0">
            {children}
             <div className="lg:w-1/2 w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-tl-3xl rounded-bl-3xl lg:flex items-center justify-center hidden relative overflow-hidden">
               {/* PLN Logo - Top Left */}
               <div className="absolute top-8 left-8 flex items-center space-x-3">
                 <span className="text-white text-2xl font-bold">PLN ICON PLUS</span>
                 <div className="flex items-center">
                   <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                   <div className="w-6 h-1 bg-yellow-400 ml-1"></div>
                 </div>
               </div>
               
               {/* Main Corporate Content */}
               <div className="relative z-10 text-center text-white px-12 py-16 max-w-lg">
                 {/* Corporate Branding Card */}
                 <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 border border-white/20 shadow-2xl">
                   
                   <div className="space-y-3">
                     <h1 className="text-3xl font-bold text-white leading-tight">
                       Solution Architect HUB
                     </h1>
                     <span className="text-white font-medium">by Solution Architect PLN 1</span>
                   </div>
                   
                   {/* Corporate Features */}
                   <div className="mt-12 space-y-4">
                     <div className="flex items-center justify-center space-x-4">
                       <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                         <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                         </svg>
                       </div>
                       <span className="text-white font-medium">Analytics Dashboard</span>
                     </div>
                     
                     <div className="flex items-center justify-center space-x-4">
                       <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                         <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                         </svg>
                       </div>
                       <span className="text-white font-medium">Secure Access</span>
                     </div>
                     
                     <div className="flex items-center justify-center space-x-4">
                       <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                         <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                         </svg>
                       </div>
                       <span className="text-white font-medium">Real-time Updates</span>
                     </div>
                   </div>
                 </div>
               </div>
               
               {/* Decorative Elements - Bottom Right */}
               <div className="absolute bottom-8 right-8">
                 <div className="flex space-x-3">
                   <div className="w-10 h-1 bg-yellow-400 transform rotate-45"></div>
                   <div className="w-10 h-1 bg-white transform rotate-45"></div>
                 </div>
               </div>
             </div>
          </div>
        </ThemeProvider>
      </div> 
    </ToastProvider>
  );
}
