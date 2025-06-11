import React from 'react';

interface HeaderProps {
  selectedMethod: string;
  supportedMethods: string[];
  onMethodChange: (method: string) => void;
}
const Header: React.FC<HeaderProps> = ({
  selectedMethod,
  supportedMethods,
  onMethodChange,
}) => {
  return (
    <header className="w-full bg-gray-100 dark:bg-gray-800 p-4 border-b border-gray-300 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold">ChatApp</span>
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="method-select" className="mr-2 text-sm">
              Method:
            </label>
            <select
              id="method-select"
              value={selectedMethod}
              onChange={(e) => onMethodChange(e.target.value)}
              className="p-1 border rounded bg-white dark:bg-gray-800 text-sm"
            >
              {supportedMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
