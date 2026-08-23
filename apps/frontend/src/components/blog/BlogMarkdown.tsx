import ReactMarkdown from "react-markdown";

interface BlogMarkdownProps {
  content: string;
}

export default function BlogMarkdown({ content }: BlogMarkdownProps) {
  return (
    <div className="prose prose-neutral max-w-none">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h2 className="mt-10 text-2xl font-semibold tracking-tight text-gray-900">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 text-xl font-semibold text-gray-900">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mt-4 text-base leading-8 text-gray-700">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-gray-700">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          a: ({ href, children }) => {
            const isExternal = href?.startsWith("http");

            return (
              <a
                href={href}
                className="font-medium text-primary underline underline-offset-4"
                {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {children}
              </a>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-4 border-primary/30 pl-4 italic text-gray-600">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-gray-900">{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
