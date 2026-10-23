import React, { useState } from 'react';
import { IconCopy, IconCheck, IconCode, IconTerminal2 } from '@tabler/icons-react';

export interface CodeSnippetViewerProps {
  code: string;
  language?: string;
  title?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export const CodeSnippetViewer: React.FC<CodeSnippetViewerProps> = ({
  code,
  language = 'python',
  title,
  filename,
  showLineNumbers = true,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const cleanCode = (code || '').trimEnd();
  const lines = cleanCode.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = cleanCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Lightweight regex tokenizer for syntax highlighting
  const renderHighlightedLine = (line: string): React.ReactNode => {
    if (!line) return <span>&nbsp;</span>;

    // Check for full line comments
    if (/^\s*(#|\/\/|\/\*)/.test(line)) {
      return <span className="text-[#64748B] italic">{line}</span>;
    }

    // Tokenize line with regex capturing strings, comments, keywords, numbers
    const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|#.*|\/\/.*|\b(?:def|class|return|import|from|as|if|elif|else|for|while|in|try|except|finally|with|async|await|const|let|var|function|type|interface|public|private|static|new|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|AND|OR)\b|\b(?:True|False|None|true|false|null|undefined|nil)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*(?=\()|[^\s\w]+|\s+|\w+)/g;

    const tokens: React.ReactNode[] = [];
    let match: RegExpExecArray | null;
    let index = 0;

    const keywords = new Set([
      'def', 'class', 'return', 'import', 'from', 'as', 'if', 'elif', 'else',
      'for', 'while', 'in', 'try', 'except', 'finally', 'with', 'async', 'await',
      'const', 'let', 'var', 'function', 'type', 'interface', 'public', 'private',
      'static', 'new', 'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE',
      'JOIN', 'AND', 'OR'
    ]);

    const constants = new Set(['True', 'False', 'None', 'true', 'false', 'null', 'undefined', 'nil']);

    while ((match = tokenRegex.exec(line)) !== null) {
      const token = match[0];
      const key = `${index++}-${token}`;

      if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
        // String literal - Emerald/Green
        tokens.push(<span key={key} className="text-[#34D399]">{token}</span>);
      } else if (token.startsWith('#') || token.startsWith('//')) {
        // Trailing comment - Slate italic
        tokens.push(<span key={key} className="text-[#64748B] italic">{token}</span>);
      } else if (keywords.has(token)) {
        // Keyword - Magenta / Violet
        tokens.push(<span key={key} className="text-[#C084FC] font-semibold">{token}</span>);
      } else if (constants.has(token)) {
        // Boolean/Null - Amber
        tokens.push(<span key={key} className="text-[#FBBF24] font-semibold">{token}</span>);
      } else if (/^\d+(?:\.\d+)?$/.test(token)) {
        // Numbers - Sky Blue
        tokens.push(<span key={key} className="text-[#38BDF8]">{token}</span>);
      } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token) && line[match.index + token.length] === '(') {
        // Function invocation - Gold / Yellow
        tokens.push(<span key={key} className="text-[#FCD34D]">{token}</span>);
      } else {
        tokens.push(<span key={key}>{token}</span>);
      }
    }

    return tokens;
  };

  const displayTitle = filename || title || `${language.toUpperCase()} Snippet`;

  return (
    <div className={`rounded-xl border border-[var(--cn-border)] bg-[#0B0D11] overflow-hidden shadow-lg select-text ${className}`}>
      {/* Code Card Top Toolbar */}
      <div className="h-10 px-4 bg-[#12151C] border-b border-[var(--cn-border)] flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>

          <div className="flex items-center gap-1.5 pl-1.5 text-xs font-mono font-medium text-slate-300 truncate">
            {language === 'bash' || language === 'sh' ? (
              <IconTerminal2 size={14} className="text-[var(--cn-primary)] shrink-0" />
            ) : (
              <IconCode size={14} className="text-[var(--cn-primary)] shrink-0" />
            )}
            <span className="truncate">{displayTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-[var(--cn-primary)] border border-[var(--cn-border)] uppercase font-semibold">
            {language}
          </span>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-mono text-slate-200 hover:text-white transition-[background-color,transform] duration-150 cursor-pointer"
            title="Copy code to clipboard"
            aria-label="Copy code to clipboard"
          >
            {copied ? (
              <>
                <IconCheck size={13} className="text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <IconCopy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Text Area */}
      <div className="p-4 overflow-x-auto font-mono text-xs text-slate-200 leading-relaxed max-h-[500px] overflow-y-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                {showLineNumbers && (
                  <td className="w-10 pr-4 text-right text-slate-600 select-none font-mono text-[11px] align-top">
                    {idx + 1}
                  </td>
                )}
                <td className="whitespace-pre font-mono">
                  {renderHighlightedLine(line)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
