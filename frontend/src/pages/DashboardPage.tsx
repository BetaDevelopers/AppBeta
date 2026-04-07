import React, { useEffect, useState } from 'react';
import { useNotesStore } from '../store/notesStore';
import { useSubjectsStore } from '../store/subjectsStore';
import { Toolbar } from '../components/layout/Toolbar';
import { SidebarLeft } from '../components/layout/SidebarLeft';
import { NotePaper } from '../components/notes/NotePaper';
import SidebarRight from '../components/layout/SidebarRight';
import MathToolsModals from '../components/math/MathToolsModals';
import ChatWidget from '../components/layout/ChatWidget';

export default function DashboardPage() {
    const { fetchNotes } = useNotesStore();
    const { fetchSubjects } = useSubjectsStore();
    const [leftOpen, setLeftOpen] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);

    useEffect(() => {
        fetchSubjects();
        fetchNotes();
    }, []);

    return (
        <div className="flex flex-col h-screen bg-[#0a0f1e]">
            <Toolbar
                onToggleChat={() => setChatOpen(v => !v)}
                chatOpen={chatOpen}
            />
            <div className="flex flex-1 overflow-hidden">
                <SidebarLeft
                    collapsed={!leftOpen}
                    onToggle={() => setLeftOpen(v => !v)}
                />
                <NotePaper />
                <SidebarRight />
            </div>
            <MathToolsModals />
            <ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    );
}
