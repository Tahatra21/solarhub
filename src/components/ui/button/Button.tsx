import React, { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "outline";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  loading?: boolean; // Tambahkan prop loading
  type?: "button" | "submit" | "reset"; // Tambahkan prop type
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  loading = false,
  type = "button",
}) => {
  // Size Classes
  const sizeClasses = {
    sm: "px-4 py-2.5 text-sm font-medium",
    md: "px-6 py-3 text-sm font-medium",
  };

  // Variant Classes
  const variantClasses = {
    primary:
      "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none transition-all duration-200",
    outline:
      "bg-white/80 backdrop-blur-sm text-gray-700 border border-gray-200/50 hover:bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200",
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-medium gap-2 rounded-xl transition-all duration-200 ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        isDisabled ? "cursor-not-allowed opacity-50" : ""
      }`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      )}
      {startIcon && !loading && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && !loading && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;