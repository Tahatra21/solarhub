"use client";
import React, { useState } from 'react';
import { Eye, EyeOff, Zap, Wifi, Database, Cloud, Leaf, Video } from 'lucide-react';

export default function PLNLandscapeLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-0 overflow-hidden relative">
      {/* Animated Background Grid */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%">
            <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#smallGrid)" />
          </svg>
        </div>
      </div>

      {/* Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>

      {/* Main Container - Landscape */}
      <div className="w-full h-screen flex items-center justify-center px-20">
        <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden flex" style={{height: '85vh'}}>
          
          {/* Left Side - Login Form */}
          <div className="w-2/5 p-12 flex flex-col justify-center bg-gradient-to-br from-white to-blue-50">
            <div className="max-w-md mx-auto w-full">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-24 h-24 flex items-center justify-center">
                  <img 
                    src="/images/logo/pln-icon-plus-logo.png" 
                    alt="PLN Icon Plus Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Solution Architect HUB</p>
              </div>

              <div className="space-y-5">
                {/* Username */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="Username"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">Tetap masuk</span>
                  </label>
                </div>

                {/* Login Button */}
                <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/30 hover:shadow-xl">
                  Masuk
                </button>
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Butuh bantuan?{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold">
                    Hubungi IT Support
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Visual & Products */}
          <div className="w-3/5 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-12 flex flex-col justify-center relative overflow-hidden">
            {/* Animated Network Lines */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" className="absolute">
                <line x1="10%" y1="20%" x2="90%" y2="30%" stroke="white" strokeWidth="2" className="animate-pulse"/>
                <line x1="20%" y1="40%" x2="80%" y2="60%" stroke="white" strokeWidth="2" className="animate-pulse" style={{animationDelay: '0.5s'}}/>
                <line x1="30%" y1="70%" x2="70%" y2="80%" stroke="white" strokeWidth="2" className="animate-pulse" style={{animationDelay: '1s'}}/>
              </svg>
            </div>

            {/* Content */}
            <div className="relative z-10 text-white">
              <div className="mb-8">
                <h2 className="text-5xl font-bold mb-4 leading-tight">
                  PLN ICON PLUS
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <div className="w-6 h-1 bg-yellow-400 rounded-full"></div>
                </div>
              </div>

              <p className="text-lg text-blue-100 mb-8 max-w-xl">
                Platform terintegrasi untuk mengelola arsitektur solusi digital PLN dengan teknologi terdepan
              </p>

              {/* Products Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-400/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                      <Leaf className="w-5 h-5 text-green-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-0.5">Digital Green Energy</h3>
                      <p className="text-xs text-blue-100">Sustainable energy solutions</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                      <Zap className="w-5 h-5 text-yellow-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-0.5">Digital Electricity Services</h3>
                      <p className="text-xs text-blue-100">Smart grid management</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-400/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                      <Video className="w-5 h-5 text-purple-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-0.5">Multimedia</h3>
                      <p className="text-xs text-blue-100">Digital content platform</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-400/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                      <Wifi className="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-0.5">Network Infrastructure</h3>
                      <p className="text-xs text-blue-100">Enterprise connectivity</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-400/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                      <Database className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-0.5">Data Center</h3>
                      <p className="text-xs text-blue-100">High-performance infrastructure</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-cyan-400/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                      <Cloud className="w-5 h-5 text-cyan-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-0.5">Cloud, SaaS & IoT Services</h3>
                      <p className="text-xs text-blue-100">Scalable digital solutions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute top-10 right-10 w-32 h-32 border-4 border-white/10 rounded-full"></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 border-4 border-white/10 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-xs">
        <p>© 2025 PLN Icon Plus - Solution Architect PLN 1</p>
      </div>
    </div>
  );
}
