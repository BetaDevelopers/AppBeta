import React, { useState } from 'react'
import { aiClient, FormField } from '@/lib/ai/client'
import { Layout, ListTodo, Save, Sparkles, RefreshCcw } from 'lucide-react'
import { clsx } from 'clsx'

export const SmartFormGenerator: React.FC<{ content: string }> = ({ content }) => {
    const [fields, setFields] = useState<FormField[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const handleGenerate = async () => {
        setIsLoading(true)
        try {
            const res = await aiClient.extractFormFields(content)
            setFields(res)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="mt-8 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-600/20 rounded-lg text-violet-400">
                        <ListTodo size={20} />
                    </div>
                    <div>
                        <h2 className="text-white font-bold leading-none">Smart Form Generator</h2>
                        <p className="text-xs text-slate-500 mt-1">IA extrae automáticamente campos de tus notas</p>
                    </div>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-violet-400 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                    {isLoading ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {fields.length > 0 ? 'Regenerar' : 'Extraer Estructura'}
                </button>
            </div>

            <div className="space-y-4">
                {fields.length === 0 && !isLoading && (
                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl">
                        <Layout size={32} className="text-slate-700 mb-2" />
                        <p className="text-sm text-slate-600 font-medium">No se han extraído campos todavía.</p>
                    </div>
                )}

                {fields.map((field, idx) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex-1">
                            <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.1em] block mb-1">{field.label}</label>
                            {field.type === 'text' && (
                                <input type="text" className="w-full bg-transparent border-none p-0 text-slate-200 text-sm focus:outline-none placeholder:text-slate-700" placeholder="Pendiente..." />
                            )}
                            {field.type === 'date' && (
                                <input type="date" className="w-full bg-transparent border-none p-0 text-slate-200 text-sm focus:outline-none [color-scheme:dark]" />
                            )}
                        </div>
                        {field.type === 'checkbox' && (
                            <input type="checkbox" className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-600/20" />
                        )}
                    </div>
                ))}
            </div>

            {fields.length > 0 && (
                <button className="w-full mt-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-600/20">
                    <Save size={16} />
                    <span>Guardar como Guía de Estudio</span>
                </button>
            )}
        </div>
    )
}
