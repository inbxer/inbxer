import React from 'react';

/**
 * Renders the lightweight markdown subset the reply composer's formatting
 * toolbar produces (bold, italic, strikethrough, inline code, links,
 * blockquotes, and bulleted/numbered lists). Builds React elements directly
 * instead of raw HTML, so there is no injection risk.
 */
export function MarkdownBody({ text }: { text: string }) {
    if (!text) {
        return null;
    }

    const lines = text.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (/^\s*[-*]\s+/.test(line)) {
            const items: string[] = [];

            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
                i++;
            }

            blocks.push(
                <ul key={key++} className="list-disc space-y-0.5 pl-5">
                    {items.map((item, idx) => (
                        <li key={idx}>{renderInline(item)}</li>
                    ))}
                </ul>,
            );
            continue;
        }

        if (/^\s*\d+\.\s+/.test(line)) {
            const items: string[] = [];

            while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
                i++;
            }

            blocks.push(
                <ol key={key++} className="list-decimal space-y-0.5 pl-5">
                    {items.map((item, idx) => (
                        <li key={idx}>{renderInline(item)}</li>
                    ))}
                </ol>,
            );
            continue;
        }

        if (/^\s*>\s?/.test(line)) {
            const quoteLines: string[] = [];

            while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
                quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
                i++;
            }

            blocks.push(
                <blockquote
                    key={key++}
                    className="border-l-2 border-border pl-3 text-foreground/70 italic"
                >
                    {quoteLines.map((ql, idx) => (
                        <React.Fragment key={idx}>
                            {idx > 0 && <br />}
                            {renderInline(ql)}
                        </React.Fragment>
                    ))}
                </blockquote>,
            );
            continue;
        }

        if (line.trim() === '') {
            blocks.push(<div key={key++} className="h-2" />);
            i++;
            continue;
        }

        const paraLines: string[] = [];

        while (
            i < lines.length &&
            lines[i].trim() !== '' &&
            !/^\s*[-*]\s+/.test(lines[i]) &&
            !/^\s*\d+\.\s+/.test(lines[i]) &&
            !/^\s*>\s?/.test(lines[i])
        ) {
            paraLines.push(lines[i]);
            i++;
        }

        blocks.push(
            <p key={key++}>
                {paraLines.map((pl, idx) => (
                    <React.Fragment key={idx}>
                        {idx > 0 && <br />}
                        {renderInline(pl)}
                    </React.Fragment>
                ))}
            </p>,
        );
    }

    return <div className="space-y-1.5 whitespace-pre-wrap">{blocks}</div>;
}

function renderInline(text: string): React.ReactNode {
    // Priority: inline code, bold, strikethrough, link, italic.
    const patterns: Array<{
        regex: RegExp;
        render: (match: RegExpExecArray) => React.ReactNode;
    }> = [
        {
            regex: /`([^`]+)`/,
            render: (m) => <code key="c">{m[1]}</code>,
        },
        {
            regex: /\*\*([^*]+)\*\*/,
            render: (m) => <strong key="b">{renderInline(m[1])}</strong>,
        },
        {
            regex: /~~([^~]+)~~/,
            render: (m) => <del key="s">{renderInline(m[1])}</del>,
        },
        {
            regex: /\[([^\]]+)\]\(([^)]+)\)/,
            render: (m) => (
                <a
                    key="a"
                    href={m[2]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                >
                    {m[1]}
                </a>
            ),
        },
        {
            regex: /(^|[^*])\*([^*]+)\*(?!\*)/,
            render: (m) => (
                <React.Fragment key="i">
                    {m[1]}
                    <em>{renderInline(m[2])}</em>
                </React.Fragment>
            ),
        },
    ];

    let earliestIndex = -1;
    let earliestMatch: RegExpExecArray | null = null;
    let earliestPattern: (typeof patterns)[number] | null = null;

    for (const pattern of patterns) {
        const match = pattern.regex.exec(text);

        if (match && (earliestIndex === -1 || match.index < earliestIndex)) {
            earliestIndex = match.index;
            earliestMatch = match;
            earliestPattern = pattern;
        }
    }

    if (!earliestMatch || !earliestPattern) {
        return text;
    }

    const before = text.slice(0, earliestMatch.index);
    const after = text.slice(earliestMatch.index + earliestMatch[0].length);

    return (
        <>
            {before}
            {earliestPattern.render(earliestMatch)}
            {renderInline(after)}
        </>
    );
}
