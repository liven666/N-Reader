import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Dices } from 'lucide-react';
import { acEmoticons } from './acEmoticons';

export function Collapse({ title, children }: { title: string, children: React.ReactNode, key?: React.Key }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="my-3 border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-3 bg-[#FFF9E6] dark:bg-zinc-800/80 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-[#FDF4D4] dark:hover:bg-zinc-700 transition-colors"
      >
        <span className="truncate pr-4">{title || '点击展开隐藏内容'}</span>
        {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
      </button>
      {isOpen && (
        <div className="p-3 border-t border-gray-200 dark:border-zinc-700 bg-[#FFFDF5] dark:bg-zinc-900 text-sm">
          {children}
        </div>
      )}
    </div>
  );
}

export function DiceRoll({ content }: { content: string, key?: React.Key }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-mono border border-amber-200 dark:border-amber-800/50 mx-1">
      <Dices className="w-3.5 h-3.5" />
      {content}
    </span>
  );
}

// A more advanced BBCode parser for NGA
export function parseBBCode(text: string): React.ReactNode {
  if (!text) return null;

  // 1. Handle [collapse=Title]...[/collapse]
  const collapseRegex = /\[collapse(?:=([^\]]*))?\]([\s\S]*?)\[\/collapse\]/g;
  if (collapseRegex.test(text)) {
    const parts = text.split(collapseRegex);
    const result: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 3 === 0) {
        result.push(<React.Fragment key={i}>{parseBBCode(parts[i])}</React.Fragment>);
      } else if (i % 3 === 1) {
        const title = parts[i];
        const content = parts[i + 1];
        result.push(<Collapse key={i} title={title}>{parseBBCode(content)}</Collapse>);
        i++; // skip content
      }
    }
    return result;
  }

  // 2. Handle [quote]...[/quote]
  const quoteRegex = /\[quote\]([\s\S]*?)\[\/quote\]/g;
  if (quoteRegex.test(text)) {
    const parts = text.split(quoteRegex);
    return parts.map((part, i) => {
      if (i % 2 === 0) {
        // Trim leading/trailing newlines for text outside quotes to avoid extra spacing
        const trimmedPart = part.replace(/^[\r\n]+|[\r\n]+$/g, '');
        return trimmedPart ? <React.Fragment key={i}>{parseBBCode(trimmedPart)}</React.Fragment> : null;
      } else {
        return (
          <blockquote key={i} className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-400 p-2 mt-0 mb-0 first:mt-0 last:mb-0 text-sm text-gray-700 dark:text-gray-300 rounded-r-md">
            {parseBBCode(part.trim())}
          </blockquote>
        );
      }
    });
  }

  // Handle [pid=...]Reply[/pid]
  text = text.replace(/\[pid=[\d\s,]+\]Reply\[\/pid\]\s*/gi, '');
  
  // Handle Post by [uid=...]Name[/uid] (time):
  text = text.replace(/Post by (\[uid=[\d\s]+\].*?\[\/uid\])\s*\((.*?)\):/gi, '回复 $1 ($2):');

  // Remove the remaining [uid=...]Name[/uid] string replacement so parseInline can handle it


  // Base case: simple inline replacements
  // Split by <br/> or <br> or \n
  const lines = text.split(/<br\s*\/?>|\n/i);
  return lines.map((line, i) => {
    if (line.trim() === '') return <br key={`br-${i}`} />;
    
    // Diceroll
    if (line.includes('[diceroll=') || line.includes('[dices]')) {
      const diceParts = line.split(/\[diceroll=[^\]]*\](.*?)\[\/diceroll\]|\[dices\](.*?)\[\/dices\]/);
      return (
        <p key={`p-${i}`} className="my-0.5">
          {diceParts.map((part, j) => {
            if (!part) return null;
            // Extremely simplified diceroll check for prototype
            if (j % 3 !== 0) return <DiceRoll key={j} content={part} />;
            return <span key={j}>{parseInline(part)}</span>;
          })}
        </p>
      );
    }

    return <p key={`p-${i}`} className="mt-0 mb-0 first:mt-0 last:mb-0">{parseInline(line)}</p>;
  });
}

function parseInline(text: string): React.ReactNode {
  let processed: React.ReactNode[] = [text];

  // Bold
  processed = processTag(processed, /\[b\](.*?)\[\/b\]/g, (match, i) => <strong key={`b-${i}`} className="font-bold text-gray-900 dark:text-gray-100">{match}</strong>);
  
  // Italic
  processed = processTag(processed, /\[i\](.*?)\[\/i\]/g, (match, i) => <em key={`i-${i}`} className="italic">{match}</em>);

  // Underline
  processed = processTag(processed, /\[u\](.*?)\[\/u\]/g, (match, i) => <u key={`u-${i}`} className="underline">{match}</u>);

  // Color (simplified)
  processed = processTag(processed, /\[color=([^\]]+)\](.*?)\[\/color\]/g, (match, i, color) => <span key={`c-${i}`} style={{ color }}>{match}</span>, 2);

  // Size
  processed = processTag(processed, /\[size=([^\]]+)\](.*?)\[\/size\]/g, (match, i, size) => {
    let fontSize = size;
    if (size.endsWith('%')) {
      // Keep percentage
    } else if (!isNaN(Number(size))) {
      // Some NGA sizes are just numbers
      fontSize = `${Number(size) * 10}%`;
    }
    return <span key={`sz-${i}`} style={{ fontSize }}>{match}</span>;
  }, 2);

  // Align
  processed = processTag(processed, /\[align=([^\]]+)\](.*?)\[\/align\]/g, (match, i, align) => {
    const textAlign = align === 'center' || align === 'right' || align === 'left' ? align : 'left';
    return <div key={`al-${i}`} style={{ textAlign }}>{match}</div>;
  }, 2);

  // URL
  processed = processTag(processed, /\[url=([^\]]+)\](.*?)\[\/url\]/g, (match, i, url) => <a key={`url-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 hover:underline">{match}</a>, 2);
  processed = processTag(processed, /\[url\](.*?)\[\/url\]/g, (match, i) => <a key={`url2-${i}`} href={match} target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 hover:underline">{match}</a>);

  // UID/PID (simplified)
  processed = processTag(processed, /\[uid=([\d\s]+)\](.*?)\[\/uid\]/g, (match, i, uid) => <span key={`u-${i}`} className="text-amber-600 dark:text-amber-400 font-medium cursor-pointer hover:underline">@{match}</span>, 2);

  // [s:ac:name] or [s:a2:name]
  processed = processTag(processed, /\[s:(?:ac|a2):([^\]]+)\]/g, (match, i, name) => {
    const url = acEmoticons[name];
    if (url) {
      return <img key={`ac-${i}`} src={url} alt={name} className="inline-block w-8 h-8 align-middle mx-0.5" referrerPolicy="no-referrer" />;
    }
    return match; // Return original if not found
  }, 1);

  // [s]strikethrough[/s]
  processed = processTag(processed, /\[s\](.*?)\[\/s\]/g, (match, i) => <del key={`s-${i}`} className="text-gray-500">{match}</del>);

  // Images
  processed = processTag(processed, /\[img(?:=[^\]]*)?\](.*?)\[\/img\]/g, (match, i) => {
    let imgSrc = match;
    if (imgSrc.startsWith('./')) {
      imgSrc = `https://img.nga.178.com/attachments/${imgSrc.substring(2)}`;
    }
    return (
      <img key={`img-${i}`} src={imgSrc} alt="user uploaded" className="max-w-full rounded-md object-cover shadow-sm my-2 block" referrerPolicy="no-referrer" loading="lazy" />
    );
  });

  return processed;
}

function processTag(
  nodes: React.ReactNode[], 
  regex: RegExp, 
  replacer: (match: string, index: number, param?: string) => React.ReactNode,
  groups: number = 1
): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let keyCounter = 0;

  nodes.forEach(node => {
    if (typeof node === 'string') {
      const parts = node.split(regex);
      if (parts.length === 1) {
        result.push(node);
      } else {
        for (let i = 0; i < parts.length; i++) {
          if (i % (groups + 1) === 0) {
            if (parts[i]) result.push(parts[i]);
          } else {
            if (groups === 2) {
              result.push(replacer(parts[i+1], keyCounter++, parts[i]));
              i++; // skip the next part as we consumed it
            } else {
              result.push(replacer(parts[i], keyCounter++));
            }
          }
        }
      }
    } else if (React.isValidElement(node) && node.props && node.props.children) {
      const childrenArray = React.Children.toArray(node.props.children);
      const newChildren = processTag(childrenArray, regex, replacer, groups);
      result.push(React.cloneElement(node as React.ReactElement<any>, {}, ...newChildren));
    } else {
      result.push(node);
    }
  });
  return result;
}
