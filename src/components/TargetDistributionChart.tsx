"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Signal } from "./SignalTable";

interface TargetDistributionChartProps {
    signals: Signal[];
    activeChannel: string;
}

export default function TargetDistributionChart({ signals, activeChannel }: TargetDistributionChartProps) {
    const pieData = [
        { name: 'TP 1', value: signals.filter(s => s.tp_level === 1).length, color: '#22c55e' }, // Green
        { name: 'TP 2', value: signals.filter(s => s.tp_level === 2).length, color: '#06b6d4' }, // Cyan
        { name: 'TP 3', value: signals.filter(s => s.tp_level === 3).length, color: '#f59e0b' }, // Amber
        { name: 'TP 4+', value: signals.filter(s => s.tp_level >= 4).length, color: '#a855f7' }, // Purple
    ].filter(d => d.value > 0);

    return (
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col col-span-1 md:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
                <h3 className="text-xl font-bold text-foreground">Target Hit Distribution ({activeChannel})</h3>
            </div>

            <div className="flex-1 min-h-[300px] w-full">
                {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                                itemStyle={{ color: '#e2e8f0' }}
                            />
                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        No TP hits recorded for this period.
                    </div>
                )}
            </div>
        </div>
    );
}
