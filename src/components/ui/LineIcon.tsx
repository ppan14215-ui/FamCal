/**
 * Line icons for navigation and controls only (Phosphor-like, 24 grid).
 * Clay icons never appear in the bottom nav (DESIGN.md).
 * Paths copied from the `LI` table in design/gen.py.
 */
import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { tokens } from '../../theme';

export type LineName =
  | 'home' | 'cal' | 'list' | 'inbox' | 'plus' | 'mic' | 'sync' | 'camera' | 'back' | 'chev'
  | 'check' | 'x' | 'lock' | 'clock' | 'copy' | 'send' | 'flash' | 'pin' | 'sparkle' | 'settings'
  | 'papier' | 'users' | 'undo' | 'trash';

type Props = { name: LineName; size?: number; color?: string; stroke?: number };

export default function LineIcon({ name, size = 22, color = tokens.ink, stroke = 1.8 }: Props) {
  const p = { stroke: color, strokeWidth: stroke, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {shape(name, p)}
    </Svg>
  );
}

function shape(n: LineName, p: any) {
  switch (n) {
    case 'home': return <Path {...p} d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />;
    case 'cal': return <><Rect {...p} x={4} y={5} width={16} height={15} rx={2} /><Path {...p} d="M4 10h16M9 3v4M15 3v4" /></>;
    case 'list': return <><Path {...p} d="M9 6h11M9 12h11M9 18h11" /><Circle {...p} cx={4.5} cy={6} r={1} /><Circle {...p} cx={4.5} cy={12} r={1} /><Circle {...p} cx={4.5} cy={18} r={1} /></>;
    case 'inbox': return <><Path {...p} d="M4 13l3-8h10l3 8v6H4z" /><Path {...p} d="M4 13h5l1 2h4l1-2h5" /></>;
    case 'plus': return <Path {...p} d="M12 5v14M5 12h14" />;
    case 'mic': return <><Rect {...p} x={9} y={3} width={6} height={11} rx={3} /><Path {...p} d="M6 11a6 6 0 0 0 12 0M12 17v4" /></>;
    case 'sync': return <><Path {...p} d="M5 12a7 7 0 0 1 12-5l2 2M19 12a7 7 0 0 1-12 5l-2-2" /><Path {...p} d="M19 4v5h-5M5 20v-5h5" /></>;
    case 'camera': return <><Path {...p} d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle {...p} cx={12} cy={13} r={3.5} /></>;
    case 'back': return <Path {...p} d="M15 5l-7 7 7 7" />;
    case 'chev': return <Path {...p} d="M9 5l7 7-7 7" />;
    case 'check': return <Path {...p} d="M5 12.5l4.5 4.5L19 7.5" />;
    case 'trash': return <><Path {...p} d="M4 7h16M10 4h4M6 7l1 13h10l1-13" /><Path {...p} d="M10 11v6M14 11v6" /></>;
    case 'x': return <Path {...p} d="M6 6l12 12M18 6L6 18" />;
    case 'lock': return <><Rect {...p} x={5} y={11} width={14} height={9} rx={2} /><Path {...p} d="M8 11V8a4 4 0 0 1 8 0v3" /></>;
    case 'clock': return <><Circle {...p} cx={12} cy={12} r={8} /><Path {...p} d="M12 8v4l3 2" /></>;
    case 'copy': return <><Rect {...p} x={8} y={8} width={12} height={12} rx={2} /><Path {...p} d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>;
    case 'send': return <Path {...p} d="M4 12l16-8-6 16-3-7z" />;
    case 'flash': return <Path {...p} d="M13 3L5 14h6l-1 7 8-11h-6z" />;
    case 'pin': return <><Path {...p} d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" /><Circle {...p} cx={12} cy={10} r={2} /></>;
    // Two soft four-point stars, filled, like the assistant's mark elsewhere.
    case 'sparkle': return <><Path fill={p.stroke} d="M10 3.5c.5 4.3 2.2 6 6.5 6.5-4.3.5-6 2.2-6.5 6.5-.5-4.3-2.2-6-6.5-6.5 4.3-.5 6-2.2 6.5-6.5z" /><Path fill={p.stroke} d="M18 13.5c.25 2.1 1.1 2.95 3.2 3.2-2.1.25-2.95 1.1-3.2 3.2-.25-2.1-1.1-2.95-3.2-3.2 2.1-.25 2.95-1.1 3.2-3.2z" /></>;
    case 'settings': return <><Circle {...p} cx={12} cy={12} r={3} /><Path {...p} d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" /></>;
    case 'papier': return <><Path {...p} d="M4 20h4L19 9l-4-4L4 16z" /><Path {...p} d="M13.5 6.5l4 4" /></>;
    case 'users': return <><Circle {...p} cx={9} cy={9} r={3} /><Circle {...p} cx={17} cy={10} r={2.5} /><Path {...p} d="M3 19c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 1 6 4" /></>;
    case 'undo': return <><Path {...p} d="M9 14L4 9l5-5" /><Path {...p} d="M4 9h10a6 6 0 0 1 0 12h-3" /></>;
  }
}
