import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '../services/apiService';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  const components = {
    // Render code blocks and inline code
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={atomDark}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-center'}`}>
      <div
        className={`px-4 py-2 rounded-lg shadow w-full ${
          isUser
            ? 'lg:w-1/3 bg-gray-700 text-white'
            : 'lg:w-full xl:w-2/3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
        }`}
      >
        <div className="prose dark:prose-invert max-w-full">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
