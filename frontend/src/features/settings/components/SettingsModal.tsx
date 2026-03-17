import React, { useState } from 'react'
import { X, Settings, User, Globe, Moon, Sun, ShieldCheck, Database, Save, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [userName, setUserName] = useState('Nacho del Río')
    const [ocrLang, setOcrLang] = useState('spa')
    const [theme, setTheme] = useState('dark')

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 backdrop-blur-2xl bg-black/60">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-[#161b22] w-full max-w-2xl rounded-[32px] border border-white/10 shadow-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
                            <Settings size={24} />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-2xl tracking-tighter uppercase">Ajustes</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Configuración del Sistema Beta 3M</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-10">

                    {/* Perfil section */}
                    <section>
                        <SettingHeader icon={<User size={18} />} title="Perfil de Usuario" />
                        <div className="grid grid-cols-1 gap-6 mt-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Público</label>
                                <input
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>
                        </div>
                    </section>

                    {/* App section */}
                    <section>
                        <SettingHeader icon={<Globe size={18} />} title="Idioma y OCR" />
                        <div className="grid grid-cols-1 gap-6 mt-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Idioma de Reconocimiento (OCR)</label>
                                <select
                                    value={ocrLang}
                                    onChange={(e) => setOcrLang(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                                >
                                    <option value="spa">Español (Recomendado)</option>
                                    <option value="eng">Inglés</option>
                                    <option value="fra">Francés</option>
                                    <option value="deu">Alemán</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Info section */}
                    <section className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-3 text-emerald-400">
                            <ShieldCheck size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">Estado del Sistema</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoCard icon={<Database size={14} />} label="Base de Datos" value="IndexedDB Local" />
                            <InfoCard icon={<Sparkles size={14} />} label="AI Engine" value="Beta Optimizer" />
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-8 bg-black/20 border-t border-white/5 flex items-center justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-black rounded-2xl transition-all uppercase text-xs tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center gap-3 uppercase text-xs tracking-widest"
                    >
                        <Save size={16} />
                        Guardar Cambios
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

const SettingHeader: React.FC<{ icon: React.ReactNode, title: string }> = ({ icon, title }) => (
    <div className="flex items-center gap-3 mb-4 text-slate-400">
        <div className="opacity-50">{icon}</div>
        <h3 className="text-xs font-black uppercase tracking-widest">{title}</h3>
    </div>
)

const InfoCard: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
    <div className="bg-black/20 rounded-2xl p-4 border border-white/[0.03]">
        <div className="flex items-center gap-2 text-slate-500 mb-1">
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className="text-white text-sm font-bold">{value}</div>
    </div>
)
