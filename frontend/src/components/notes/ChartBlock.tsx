import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

interface ChartBlockProps {
    type: 'bar' | 'line' | 'pie' | 'scatter';
    data: any;
    reasoning?: string;
}

export const ChartBlock: React.FC<ChartBlockProps> = ({ type, data, reasoning }) => {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: { weight: 'bold' as const, size: 10 },
                },
            },
            title: {
                display: !!data.datasets[0].label,
                text: data.datasets[0].label,
                color: '#fff',
            },
        },
        scales: type !== 'pie' ? {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: 'rgba(255, 255, 255, 0.5)' },
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: 'rgba(255, 255, 255, 0.5)' },
            },
        } : {},
    };

    const renderChart = () => {
        switch (type) {
            case 'line': return <Line options={options} data={data} />;
            case 'pie': return <Pie options={options} data={data} />;
            case 'scatter': return <Scatter options={options} data={data} />;
            default: return <Bar options={options} data={data} />;
        }
    };

    return (
        <div className="my-8 bg-[#141b2d] border border-white/5 rounded-3xl p-6 shadow-2xl transition-all hover:border-blue-500/30">
            <div className="h-[300px] w-full">
                {renderChart()}
            </div>
            {reasoning && (
                <div className="mt-4 flex gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                    <div className="text-blue-400">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 16v-4m0-4h.01M22 12A10 10 0 112 12a10 10 0 0120 0z" />
                        </svg>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">
                        <strong>Analista IA:</strong> {reasoning}
                    </p>
                </div>
            )}
        </div>
    );
};
