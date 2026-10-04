import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export interface EmployeeLeaveChartProps {
  remainingBalance: number;
  usedBalance?: number;
  annualBalanceLimit: number;
  isLowBalance?: boolean;
  variant?: 'card' | 'mini';
  className?: string;
}

export const EmployeeLeaveChart: React.FC<EmployeeLeaveChartProps> = ({
  remainingBalance = 0,
  usedBalance = 0,
  annualBalanceLimit = 36,
  isLowBalance = false,
  variant = 'card',
  className = '',
}) => {
  const safeLimit = Math.max(1, annualBalanceLimit);
  const safeRemaining = Math.max(0, remainingBalance);
  // Calculate actual used if not passed or ensure positive
  const safeUsed = Math.max(0, usedBalance || Math.max(0, safeLimit - safeRemaining));
  const remainingPercent = Math.min(100, Math.round((safeRemaining / safeLimit) * 100));

  // Determine healthy/warning colors
  const remainingColor =
    safeRemaining / safeLimit > 0.5
      ? '#10b981' // emerald-500
      : safeRemaining / safeLimit > 0.25
      ? '#f59e0b' // amber-500
      : '#f43f5e'; // rose-500

  const usedColor = '#cbd5e1'; // slate-300 / muted track
  const emptyFill = '#e2e8f0'; // slate-200

  const data = [
    { name: 'الرصيد المتبقي', value: safeRemaining, fill: remainingColor },
    { name: 'الرصيد المستهلك', value: safeUsed, fill: usedColor },
  ];

  // If both values are 0, show a placeholder ring
  const hasData = safeRemaining > 0 || safeUsed > 0;
  const chartData = hasData ? data : [{ name: 'لا يوجد رصيد', value: 1, fill: emptyFill }];

  if (variant === 'mini') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <div className="w-10 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={11}
                outerRadius={18}
                paddingAngle={hasData && safeUsed > 0 && safeRemaining > 0 ? 3 : 0}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-mini-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <span className="sr-only">{remainingPercent}%</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 ${className}`}>
      {/* Visual Donut Chart */}
      <div className="relative w-20 h-20 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(value: any, name: any) => [`${value} يوماً`, name]}
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                borderRadius: '0.75rem',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                direction: 'rtl',
                textAlign: 'right',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
              }}
              itemStyle={{ color: '#fff', padding: '2px 0' }}
            />
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={23}
              outerRadius={36}
              paddingAngle={hasData && safeUsed > 0 && safeRemaining > 0 ? 3 : 0}
              dataKey="value"
              stroke="none"
              isAnimationActive={true}
              animationDuration={600}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-card-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="text-xs font-black font-mono leading-tight text-slate-800 dark:text-slate-100">
            {remainingPercent}%
          </span>
          <span className="text-[8px] font-semibold text-slate-400 leading-none">متبقي</span>
        </div>
      </div>

      {/* Numeric Breakdown */}
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            رصيد الإجازات
          </span>
          {isLowBalance && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
              رصيد منخفض
            </span>
          )}
        </div>

        <div className="space-y-1">
          {/* Remaining */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: remainingColor }} />
              <span>المتبقي:</span>
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {safeRemaining} <span className="text-[10px] font-normal text-slate-400">يوم</span>
            </span>
          </div>

          {/* Used */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full shrink-0 bg-slate-300 dark:bg-slate-600" />
              <span>المستهلك:</span>
            </span>
            <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
              {safeUsed} <span className="text-[10px] font-normal text-slate-400">يوم</span>
            </span>
          </div>

          {/* Limit */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-200/60 dark:border-slate-700/60">
            <span>الحد السنوي:</span>
            <span className="font-mono">{safeLimit} يوماً</span>
          </div>
        </div>
      </div>
    </div>
  );
};
