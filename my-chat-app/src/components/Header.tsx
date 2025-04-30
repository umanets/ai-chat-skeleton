import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full bg-gray-100 dark:bg-gray-800 p-4 border-b border-gray-300 dark:border-gray-700">
      <div className="flex items-center">
        <span className="text-xl font-bold">ChatApp</span>
      </div>
    </header>
  );
};

export default Header;
