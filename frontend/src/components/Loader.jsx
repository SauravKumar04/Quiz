import React from 'react';

// Stripe-style minimalist spinning ring
export const Spinner = ({ className = "w-4 h-4", thickness = "border-[2px]" }) => (
  <div 
    className={`inline-block animate-spin rounded-full border-current border-t-transparent text-inherit ${thickness} ${className}`} 
    role="status"
    aria-label="Loading"
  />
);

// Sleek full-page or section loader
export const SectionLoader = ({ text = "Loading...", fullScreen = false }) => {
  const containerClass = fullScreen 
    ? "flex h-screen flex-col items-center justify-center bg-neutral-50 text-neutral-900" 
    : "flex flex-col items-center justify-center py-24 px-6 text-neutral-900 bg-white rounded-[28px] border border-neutral-200 shadow-sm w-full";

  return (
    <div className={containerClass}>
      <Spinner className="w-7 h-7 mb-4 text-neutral-900" thickness="border-[2px]" />
      <p className="text-sm font-medium tracking-wide text-neutral-500 animate-pulse">
        {text}
      </p>
    </div>
  );
};