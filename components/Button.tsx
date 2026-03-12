import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg' | string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  size = 'md',
  className = '', 
  ...props 
}) => {
  const baseStyles = "rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  const variants = {
    primary: "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-900/20",
    secondary: "bg-stone-700 hover:bg-stone-600 text-white",
    outline: "border-2 border-orange-600 text-orange-500 hover:bg-orange-600/10",
    danger: "bg-red-900/50 text-red-400 hover:bg-red-900/80 border border-red-800",
    ghost: "bg-transparent hover:bg-stone-800 text-stone-400 hover:text-white"
  };

  const currentSizeClass = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.md;
  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${currentSizeClass} ${variants[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};