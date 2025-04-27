import React, { ReactNode } from "react";

interface FormWrapperProps {
  children: ReactNode;
  className?: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function FormWrapper({ children, className = "", onSubmit }: FormWrapperProps) {
  return (
    <div className="w-full flex justify-center">
      <form
        onSubmit={onSubmit}
        className={`w-full max-w-md p-6 bg-white rounded-xl shadow-md space-y-6 ${className}`}
      >
        {children}
      </form>
    </div>
  );
}
