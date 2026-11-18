import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from 'remark-cjk-friendly';

/** AI 답변을 마크다운으로 보여 준다. HTML 태그는 해석하지 않고 글자로 보인다 (react-markdown 기본 동작). */
export const MarkdownMessage: React.FC<{ text: string }> = ({ text }) => (
  <div className="md-message">
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkCjkFriendly]}
      components={{
        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
      }}
    >
      {text}
    </ReactMarkdown>
  </div>
);

export default MarkdownMessage;
