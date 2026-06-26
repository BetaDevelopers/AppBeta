import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNotesStore } from '../store/notesStore';
import { useSubjectsStore } from '../store/subjectsStore';
import { useAuthStore } from '../store/authStore';
import { Toolbar } from '../components/layout/Toolbar';
import { SidebarLeft } from '../components/layout/SidebarLeft';
import { NotePaper } from '../components/notes/NotePaper';
import SidebarRight from '../components/layout/SidebarRight';
import MathToolsModals from '../components/math/MathToolsModals';
import ChatWidget from '../components/layout/ChatWidget';
import { GuestBanner } from '../components/GuestBanner';

type Breakpoint = 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';

function useBreakpoint(): Breakpoint {
    const [bp, setBp] = useState<Breakpoint>(() => {
        const w = window.innerWidth;
        if (w < 768) return 'mobile';
        if (w < 1024) return 'tablet-portrait';
        if (w < 1180) return 'tablet-landscape';
        return 'desktop';
    });

    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            if (w < 768) setBp('mobile');
            else if (w < 1024) setBp('tablet-portrait');
            else if (w < 1180) setBp('tablet-landscape');
            else setBp('desktop');
        };
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    return bp;
}

export default function DashboardPage() {
    const { fetchNotes, notes } = useNotesStore();
    const { fetchSubjects } = useSubjectsStore();
    const isGuest = useAuthStore(s => s.isGuest);
    const bp = useBreakpoint();

    // Sidebar visibility & collapse state
    const [leftOpen, setLeftOpen] = useState(false);
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightOpen, setRightOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    // Set initial sidebar state based on breakpoint (runs once per bp change)
    useEffect(() => {
        if (bp === 'desktop') {
            setLeftOpen(true);
            setLeftCollapsed(false);
            setRightOpen(true);
        } else if (bp === 'tablet-landscape') {
            setLeftOpen(true);
            setLeftCollapsed(true);
            setRightOpen(false);
        } else {
            // tablet-portrait & mobile: sidebars closed by default
            setLeftOpen(false);
            setLeftCollapsed(false);
            setRightOpen(false);
        }
    }, [bp]);

    // Sidebar is overlay (drawer) on mobile and tablet-portrait
    const isLeftOverlay = bp === 'mobile' || bp === 'tablet-portrait';
    const isRightOverlay = bp !== 'desktop';

    // ── Swipe gestures (native touch events, no libs) ──────────────
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchStartTime = useRef(0);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        touchStartTime.current = Date.now();
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = endX - touchStartX.current;
        const deltaY = endY - touchStartY.current;
        const elapsed = Math.max(Date.now() - touchStartTime.current, 1);
        const velocity = Math.abs(deltaX) / elapsed;

        // Ignore vertical swipes
        if (Math.abs(deltaY) > Math.abs(deltaX)) return;

        // Swipe right from left edge → open left sidebar
        if (deltaX > 30 && velocity > 0.3 && touchStartX.current < 30) {
            setLeftOpen(true);
        }

        // Swipe left → close left sidebar (only when open as overlay)
        if (deltaX < -30 && velocity > 0.3 && leftOpen && isLeftOverlay) {
            setLeftOpen(false);
        }
    }, [leftOpen, isLeftOverlay]);

    useEffect(() => {
        fetchSubjects();
        fetchNotes();
    }, []);

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isGuest && notes.some(n => n.id < 0)) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isGuest, notes]);

    const handleLeftToggle = () => {
        if (isLeftOverlay) {
            setLeftOpen(v => !v);
        } else {
            setLeftCollapsed(v => !v);
        }
    };

    return (
        <div
            className="flex flex-col h-screen bg-[#0a0f1e]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <GuestBanner />
            <Toolbar
                onToggleChat={() => setChatOpen(v => !v)}
                chatOpen={chatOpen}
                onToggleLeftSidebar={handleLeftToggle}
                leftSidebarOpen={leftOpen}
            />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Overlay backdrop — mobile & tablet-portrait */}
                {isLeftOverlay && leftOpen && (
                    <div
                        className="absolute inset-0 bg-black/60 z-[110]"
                        onClick={() => setLeftOpen(false)}
                    />
                )}

                <SidebarLeft
                    open={leftOpen}
                    collapsed={leftCollapsed}
                    isOverlay={isLeftOverlay}
                    onClose={() => setLeftOpen(false)}
                    onToggle={handleLeftToggle}
                />

                <NotePaper />

                {/* Right sidebar overlay backdrop */}
                {isRightOverlay && rightOpen && (
                    <div
                        className="absolute inset-0 bg-black/40 z-[110]"
                        onClick={() => setRightOpen(false)}
                    />
                )}

                {/* Right sidebar toggle button — visible on all breakpoints when closed */}
                {!rightOpen && (
                    <button
                        className="toolbar absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center bg-[#1e293b] border border-white/10 border-r-0 rounded-l-xl text-[#555] hover:text-white transition-colors shadow-xl"
                        style={{ width: '28px', height: '52px' }}
                        onClick={() => setRightOpen(true)}
                        aria-label="Abrir panel derecho"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                )}

                {(bp === 'desktop' || rightOpen) && (
                    <SidebarRight
                        isOverlay={isRightOverlay}
                        onClose={() => setRightOpen(false)}
                    />
                )}
            </div>

            <MathToolsModals />
            <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    );
}
