import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function CustomSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Seleccionar', 
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => 
    typeof opt === 'object' ? opt.value === value : opt === value
  );
  
  const displayValue = selectedOption 
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
    : placeholder;

  const isValueSelected = value !== undefined && value !== null && value !== '';

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center justify-between text-left shadow-sm focus:outline-none transition-colors duration-200 border",
          isOpen ? "border-[#00BFA6] ring-1 ring-[#00BFA6]" : "border-gray-100 hover:border-gray-300",
          !isValueSelected ? "text-gray-400" : "text-gray-900",
          className
        )}
      >
        <span className="truncate block flex-grow">{displayValue}</span>
        <ChevronDownIcon className={clsx("h-4 w-4 shrink-0 transition-transform duration-200 ml-2", isOpen ? "rotate-180 text-[#00BFA6]" : "text-gray-400")} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
          <ul className="max-h-60 overflow-auto focus:outline-none text-xs sm:text-sm">
            {options.map((option, idx) => {
              const optValue = typeof option === 'object' ? option.value : option;
              const optLabel = typeof option === 'object' ? option.label : option;
              const isSelected = value === optValue;

              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.(optValue);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "flex w-full items-center px-3 py-2 transition-colors duration-150",
                      isSelected 
                        ? "bg-[#EAF7F4] text-[#00BFA6] font-medium" 
                        : "text-gray-700 hover:bg-gray-50 hover:text-[#00BFA6]"
                    )}
                  >
                    <span className="truncate">{optLabel}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
