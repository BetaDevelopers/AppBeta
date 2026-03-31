import React, { useEffect, useState } from 'react';
import { useNotesStore } from '../store/notesStore';
import { useSubjectsStore } from '../store/subjectsStore';
import { Toolbar } from '../components/layout/Toolbar';
import { Sidebar } from '../components/layout/Sidebar';
import { NoteList } from '../components/notes/NoteList';
import { NoteEditor } from '../components/notes/NoteEditor';
import RightPanel from '../components/layout/RightPanel';
import MathToolsModals from '../components/math/MathToolsModals';

export default function DashboardPage() {
    const { fetchNotes, currentNote } = useNotesStore();
    const { fetchSubjects } = useSubjectsStore();
    const [rightPanelOpen, setRightPanelOpen] = useState(false);

    useEffect(() => {
        fetchSubjects();
        fetchNotes();
    }, []);

    return (
        <div className="flex flex-col h-screen bg-white">
            <Toolbar />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-hidden relative bg-slate-50/20 shadow-inner">
                    {currentNote ? (
                        <div className="h-full bg-white transition-all animate-in fade-in slide-in-from-right-4 duration-500">
                            <NoteEditor />
                        </div>
                    ) : (
                        <NoteList />
                    )}
                </main>
                <RightPanel
                    open={rightPanelOpen}
                    onToggle={() => setRightPanelOpen(v => !v)}
                />
            </div>
            <MathToolsModals />
        </div>
    );
}
