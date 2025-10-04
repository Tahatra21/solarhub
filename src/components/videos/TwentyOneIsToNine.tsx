import React from "react";

export default function TwentyOneIsToNine() {
  return (
    <div className="aspect-21/9 overflow-hidden rounded-lg relative">
      {/* YouTube Placeholder for Offline Mode */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gray-100 dark:bg-gray-800">
        <div className="w-16 h-16 mb-4 bg-red-600 rounded-lg flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          YouTube Video
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Video ID: dQw4w9WgXcQ
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Video tidak tersedia dalam mode offline
        </p>
      </div>
    </div>
  );
}
