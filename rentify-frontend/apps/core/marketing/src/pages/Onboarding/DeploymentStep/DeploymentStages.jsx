import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { DEPLOYMENT_STAGES, ICON_MAP } from './constants';

export default function DeploymentStages({ t, language, currentState }) {
  const stageOrder = [
    'initializing',
    'creating_website',
    'deploying',
    'building',
    'finalizing',
  ];
  const currentIndex = Math.max(0, stageOrder.indexOf(currentState));

  const getStageStatus = (stageId) => {
    const stageIndex = stageOrder.indexOf(stageId);
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  const progressPercent = currentIndex > 0
    ? (currentIndex / (stageOrder.length - 1)) * 100
    : 0;

  return (
    <div className="rounded-2xl bg-slate-50/80 p-5 ring-1 ring-black/[0.04] sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-[14px] font-semibold text-[#1d1d1f]">
          <span>{language === 'KH' ? 'ដំណាក់កាលការដំឡើង' : 'Deployment Pipeline'}</span>
          <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#0071e3]">
            {Math.min(currentIndex + 1, stageOrder.length)} of {stageOrder.length}
          </span>
        </h4>
        <span className="text-[12px] font-medium text-[#6e6e73]">
          {currentIndex >= stageOrder.length - 1
            ? (language === 'KH' ? 'រួចរាល់' : 'Finalizing…')
            : (language === 'KH' ? 'ដំណើរការស្វ័យប្រវត្តិ' : 'Automated provisioning')}
        </span>
      </div>

      <div className="relative">
        {/* Background Track Line */}
        <div className="absolute left-6 right-6 top-5 -z-0 h-[2px] bg-slate-200" />

        {/* Animated Active Progress Line */}
        <motion.div
          className="absolute left-6 top-5 -z-0 h-[2px] bg-emerald-500"
          initial={false}
          animate={{
            width: `${Math.min(100, Math.max(0, progressPercent))}%`,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        <div className="relative z-10 grid grid-cols-5 gap-2">
          {DEPLOYMENT_STAGES.map((stage) => {
            const status = getStageStatus(stage.id);
            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';
            const IconComponent = ICON_MAP[stage.icon] || Check;

            return (
              <div key={stage.id} className="flex flex-col items-center text-center">
                {/* Node Circle */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500'
                      : isCurrent
                      ? 'scale-110 bg-[#0071e3] text-white shadow-lg shadow-[#0071e3]/30 ring-4 ring-[#0071e3]/20'
                      : 'border-2 border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <IconComponent className="h-4 w-4" />
                  )}
                </div>

                {/* Stage Label */}
                <p
                  className={`mt-3 truncate text-[12px] font-medium transition-colors ${
                    isCurrent
                      ? 'font-semibold text-[#0071e3]'
                      : isCompleted
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  } ${language === 'KH' ? 'font-khmer' : ''}`}
                >
                  {t(stage.nameKey)}
                </p>

                {/* Micro Status */}
                <span
                  className={`mt-0.5 text-[11px] ${
                    isCurrent
                      ? 'font-medium text-[#0071e3]'
                      : isCompleted
                      ? 'font-medium text-emerald-600'
                      : 'text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓ Done' : isCurrent ? 'Active' : 'Waiting'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
