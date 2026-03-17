import React from 'react'
import { useFileSystem, Document } from '../store/useFileSystem'
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react'

interface FolderTreeProps {
    parentId: string | null;
    level: number;
}

const FolderTree: React.FC<FolderTreeProps> = ({ parentId, level }) => {
    const documents = useFileSystem((state) => state.documents.filter(d => d.parentId === parentId));
    const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div style={{ marginLeft: level * 12 }}>
            {documents.map((doc) => (
                <div key={doc.id}>
                    <div
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px 0' }}
                        onClick={() => doc.isFolder && toggleExpand(doc.id)}
                    >
                        {doc.isFolder ? (
                            <>
                                {expanded[doc.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <Folder size={16} style={{ margin: '0 4px' }} />
                            </>
                        ) : (
                            <File size={16} style={{ margin: '0 4px', marginLeft: 16 }} />
                        )}
                        <span>{doc.name}</span>
                    </div>
                    {doc.isFolder && expanded[doc.id] && (
                        <FolderTree parentId={doc.id} level={level + 1} />
                    )}
                </div>
            ))}
        </div>
    );
};

export default FolderTree
