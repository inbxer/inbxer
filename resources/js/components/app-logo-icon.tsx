import type { SVGAttributes } from 'react';

/**
 * Inbxer mark: two offset squares (55% overlap, 12% corner radius) —
 * a message handed from one channel to the next. Locked spec, see the
 * "Logo, locked" section of the Inbxer Pairings design doc.
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect
                x="0"
                y="0"
                width="22"
                height="22"
                rx="2.64"
                fill="var(--foreground)"
            />
            <rect
                x="12"
                y="12"
                width="22"
                height="22"
                rx="2.64"
                fill="var(--primary)"
            />
        </svg>
    );
}
