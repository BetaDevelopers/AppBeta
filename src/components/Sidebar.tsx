import React from 'react'
import FolderTree from './FolderTree'
import AIPanel from './AIPanel'
import { FolderPlus, FilePlus, Settings, Search, Camera } from 'lucide-react'
import { useFileSystem } from '../store/useFileSystem'
import { useCamera } from '../hooks/useCamera'

const Sidebar: React.FC = () => {
    const addDocument = useFileSystem(state => state.addDocument);
    const { capturePizarra, isCapturing } = useCamera();

    const handleAddFolder = () => {
        const name = prompt('Nombre de la carpeta:');
        if (name) addDocument({ name, isFolder: true, parentId: 'root' });
    };

    const handleAddFile = () => {
        const name = prompt('Nombre del archivo:');
        if (name) addDocument({ name, isFolder: false, parentId: 'root' });
    };

    const handleCapture = async () => {
        const result = await capturePizarra();
        if (result) alert("Captura realizada correctamente. Imagen optimizada.");
    };

    return (
        <div className="sidebar" style={{ width: 280, borderRight: '1px solid #444', height: '100vh', display: 'flex', flexDirection: 'column', background: '#2c2c2c', color: 'white' }}>
            <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>Géminis</h3>
                    <div>
                        <Search size={18} style={{ cursor: 'pointer', marginRight: 8 }} />
                        <Settings size={18} style={{ cursor: 'pointer' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button onClick={handleAddFolder} style={{ flex: 1, padding: '8px', background: '#3d3d3d', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <FolderPlus size={14} /> Carpeta
                    </button>
                    <button onClick={handleAddFile} style={{ flex: 1, padding: '8px', background: '#3d3d3d', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <FilePlus size={14} /> Apunte
                    </button>
                </div>

                <button
                    onClick={handleCapture}
                    disabled={isCapturing}
                    style={{ width: '100%', padding: '10px', marginBottom: 16, background: '#4a148c', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                    <Camera size={18} /> {isCapturing ? 'Capturando...' : 'Capturar Pizarra'}
                </button>

                <FolderTree parentId="root" level={0} />
            </div>

            <AIPanel />
        </div>
    );
};

export default Sidebar
