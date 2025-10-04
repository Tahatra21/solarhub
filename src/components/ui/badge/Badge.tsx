import React from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface BadgeProps {
  variant?: BadgeVariant; // Light or solid variant
  size?: BadgeSize; // Badge size
  color?: BadgeColor; // Badge color
  startIcon?: React.ReactNode; // Icon at the start
  endIcon?: React.ReactNode; // Icon at the end
  children: React.ReactNode; // Badge content
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center px-3 py-1.5 justify-center gap-1.5 rounded-xl font-medium shadow-sm backdrop-blur-sm";

  // Define size styles
  const sizeStyles = {
    sm: "text-theme-xs", // Smaller padding and font size
    md: "text-sm", // Default padding and font size
  };

  // Define color styles for variants
  const variants = {
    light: {
      primary:
        "bg-blue-100/80 text-blue-700 border border-blue-200/50",
      success:
        "bg-green-100/80 text-green-700 border border-green-200/50",
      error:
        "bg-red-100/80 text-red-700 border border-red-200/50",
      warning:
        "bg-yellow-100/80 text-yellow-700 border border-yellow-200/50",
      info: "bg-purple-100/80 text-purple-700 border border-purple-200/50",
      light: "bg-gray-100/80 text-gray-700 border border-gray-200/50",
      dark: "bg-gray-600/80 text-white border border-gray-500/50",
    },
    solid: {
      primary: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md",
      success: "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md",
      error: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md",
      warning: "bg-gradient-to-r from-yellow-600 to-yellow-700 text-white shadow-md",
      info: "bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md",
      light: "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md",
      dark: "bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-md",
    },
  };

  // Get styles based on size and color variant
  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;
