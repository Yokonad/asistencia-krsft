import React from 'react';
import clsx from 'clsx';

export default function CustomDatePicker({ 
  className = '', 
  inputClassName = '', 
  type = 'date',
  ...props 
}) {
  return (
    <div className={clsx("relative flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 h-[38px] focus-within:border-[#00BFA6] focus-within:ring-1 focus-within:ring-[#00BFA6]", className)}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className="size-3.5 text-gray-400 shrink-0"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
      <input 
        type={type} 
        className={clsx(
          "w-full border-none text-gray-700 text-[13px] bg-transparent p-0 focus:ring-0 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100",
          inputClassName
        )} 
        {...props}
      />
    </div>
  );
}
