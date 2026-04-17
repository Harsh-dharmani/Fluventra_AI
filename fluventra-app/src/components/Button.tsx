"use client";

import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}

export default function Button({
  children,
  variant = "primary",
  href,
  className = "",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-5 py-2.5 text-sm",
    md: "px-8 py-3.5 text-sm",
    lg: "px-10 py-4.5 text-base",
  };

  const variantClasses = {
    primary: "gradient-btn",
    secondary:
      "bg-white border-2 border-gray-200 text-gray-700 hover:border-purple/40 hover:text-purple hover:shadow-md transition-all duration-300",
    ghost:
      "bg-transparent text-gray-600 hover:text-purple hover:bg-purple/5 transition-all duration-300",
    danger:
      "bg-red-500 text-white hover:bg-red-600 transition-all duration-300 shadow-md hover:shadow-lg",
  };

  const base = `inline-flex items-center justify-center gap-2.5 font-semibold rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`;

  if (href) {
    return (
      <a href={href} className={base}>
        {children}
      </a>
    );
  }

  return (
    <button className={base} onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  );
}
