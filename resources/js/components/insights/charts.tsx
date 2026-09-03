import React from 'react';

/** Lightweight, dependency-free SVG charts for the Insights pages. No external chart library. */

function scalePoints(
    values: number[],
    width: number,
    height: number,
    padding = 4,
) {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const step =
        values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

    return values.map((v, i) => ({
        x: padding + i * step,
        y: height - padding - ((v - min) / range) * (height - padding * 2),
    }));
}

export function Sparkline({
    data,
    color = '#10b981',
    width = 160,
    height = 40,
}: {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
}) {
    if (data.length === 0 || data.every((v) => v === 0)) {
        return (
            <svg
                width={width}
                height={height}
                className="text-muted-foreground"
            >
                <line
                    x1={4}
                    y1={height / 2}
                    x2={width - 4}
                    y2={height / 2}
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeDasharray="3,3"
                />
            </svg>
        );
    }

    const points = scalePoints(data, width, height);
    const path = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
        .join(' ');
    const areaPath = `${path} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;

    return (
        <svg width={width} height={height}>
            <path d={areaPath} fill={color} opacity={0.12} />
            <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
    );
}

export function BarChart({
    data,
    color = '#60a5fa',
    height = 120,
    formatLabel,
}: {
    data: Array<{ date: string; count: number }>;
    color?: string;
    height?: number;
    formatLabel?: (date: string) => string;
}) {
    const max = Math.max(...data.map((d) => d.count), 1);
    const barWidth = 100 / Math.max(data.length, 1);
    const showEvery = Math.ceil(data.length / 8) || 1;

    return (
        <div>
            <svg
                viewBox={`0 0 100 ${height}`}
                preserveAspectRatio="none"
                className="w-full"
                style={{ height }}
            >
                {data.map((d, i) => {
                    const barHeight = (d.count / max) * (height - 4);

                    return (
                        <rect
                            key={d.date}
                            x={i * barWidth + barWidth * 0.15}
                            y={height - barHeight}
                            width={barWidth * 0.7}
                            height={barHeight}
                            fill={color}
                            rx={0.5}
                        >
                            <title>
                                {d.date}: {d.count}
                            </title>
                        </rect>
                    );
                })}
            </svg>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                {data
                    .filter((_, i) => i % showEvery === 0)
                    .map((d) => (
                        <span key={d.date}>
                            {formatLabel
                                ? formatLabel(d.date)
                                : d.date.slice(5)}
                        </span>
                    ))}
            </div>
        </div>
    );
}

export function LineChart({
    data,
    color = '#a855f7',
    height = 140,
    formatValue,
}: {
    data: Array<{ date: string; seconds: number | null }>;
    color?: string;
    height?: number;
    formatValue?: (seconds: number) => string;
}) {
    const values = data.map((d) => d.seconds ?? 0);
    const hasData = values.some((v) => v > 0);

    if (!hasData) {
        return (
            <div
                className="flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground"
                style={{ height }}
            >
                No data
            </div>
        );
    }

    const points = scalePoints(values, 400, height, 10);
    const path = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
        .join(' ');

    return (
        <svg
            viewBox={`0 0 400 ${height}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height }}
        >
            <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
            {points.map((p, i) =>
                data[i].seconds !== null ? (
                    <circle
                        key={data[i].date}
                        cx={p.x}
                        cy={p.y}
                        r={1.5}
                        fill={color}
                    >
                        <title>
                            {data[i].date}:{' '}
                            {formatValue && data[i].seconds !== null
                                ? formatValue(data[i].seconds as number)
                                : data[i].seconds}
                        </title>
                    </circle>
                ) : null,
            )}
        </svg>
    );
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Heatmap({
    cells,
}: {
    cells: Array<{ day: number; hour: number; count: number }>;
}) {
    const max = Math.max(...cells.map((c) => c.count), 1);

    const colorFor = (count: number) => {
        if (count === 0) {
            return 'var(--muted)';
        }

        const intensity = Math.min(1, count / max);

        return `color-mix(in oklch, #60a5fa ${20 + intensity * 80}%, transparent)`;
    };

    return (
        <div className="overflow-x-auto">
            <div className="inline-grid grid-cols-[auto_repeat(24,1fr)] gap-0.5">
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                    <div
                        key={h}
                        className="text-center text-[9px] text-muted-foreground"
                    >
                        {h % 3 === 0 ? h : ''}
                    </div>
                ))}
                {DAY_LABELS.map((label, dayIdx) => (
                    <React.Fragment key={label}>
                        <div className="pr-1 text-[10px] text-muted-foreground">
                            {label}
                        </div>
                        {Array.from({ length: 24 }, (_, hour) => {
                            const cell = cells.find(
                                (c) => c.day === dayIdx + 1 && c.hour === hour,
                            );

                            return (
                                <div
                                    key={hour}
                                    className="size-3 rounded-[2px]"
                                    style={{
                                        backgroundColor: colorFor(
                                            cell?.count ?? 0,
                                        ),
                                    }}
                                    title={`${label} ${hour}:00 — ${cell?.count ?? 0}`}
                                />
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

export function SegmentedBar({
    rows,
    colors,
}: {
    rows: Array<{ label: string; volume: number }>;
    colors: string[];
}) {
    const total = rows.reduce((sum, r) => sum + r.volume, 0);

    if (total === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                {rows.map((row, idx) => (
                    <div
                        key={row.label}
                        className="h-full"
                        style={{
                            width: `${(row.volume / total) * 100}%`,
                            backgroundColor: colors[idx % colors.length],
                        }}
                        title={`${row.label}: ${row.volume}`}
                    />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {rows.map((row, idx) => (
                    <span key={row.label} className="flex items-center gap-1.5">
                        <span
                            className="size-2 rounded-full"
                            style={{
                                backgroundColor: colors[idx % colors.length],
                            }}
                        />
                        {row.volume} {row.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

export const CHART_COLORS = [
    '#60a5fa',
    '#a855f7',
    '#f59e0b',
    '#10b981',
    '#ec4899',
    '#38bdf8',
    '#f43f5e',
    '#84cc16',
];
