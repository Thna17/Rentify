import React from 'react';
import DeploymentStages from '../DeploymentStages';
import DeploymentLog from '../DeploymentLog';
import { RefreshCw } from 'lucide-react';

export default function ProgressState({
  t,
  language,
  progress,
  details,
  currentState,
  stateConfig,
}) {
  const isKhmer = language === 'KH';
  const roundedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className="space-y-6">
      {/* Hero Provisioning Card */}
      <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/[0.06] shadow-[0_20px_50px_-25px_rgba(0,0,0,0.06)] sm:p-8">
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-black/[0.06] pb-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0071e3] to-[#38bdf8] text-white shadow-lg shadow-[#0071e3]/25">
              <RefreshCw className="h-6 w-6 animate-spin text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0071e3]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#0071e3]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0071e3] animate-pulse" />
                  LIVE SETUP
                </span>
              </div>
              <h3 className={`mt-1 text-[20px] font-semibold text-[#1d1d1f] ${isKhmer ? 'font-khmer' : ''}`}>
                {stateConfig?.title || t('deployment.progress.title')}
              </h3>
              <p className={`text-[13px] text-[#6e6e73] ${isKhmer ? 'font-khmer' : ''}`}>
                {stateConfig?.description || t('deployment.progress.subtitle')}
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="flex items-baseline gap-1 sm:justify-end">
              <span className="text-[36px] font-semibold tracking-tight text-[#1d1d1f]">
                {roundedProgress}
              </span>
              <span className="text-[20px] font-medium text-[#6e6e73]">%</span>
            </div>
            <p className="text-[12px] font-medium uppercase tracking-wider text-[#86868b]">
              {isKhmer ? 'បានបញ្ចប់' : 'Completed'}
            </p>
          </div>
        </div>

        {/* Continuous Smooth Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-[13px] text-[#6e6e73]">
            <span className="flex items-center gap-1.5 font-medium text-[#1d1d1f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0071e3] animate-ping" />
              {isKhmer ? 'កំពុងដំណើរការ' : 'Provisioning in progress…'}
            </span>
            <span>{isKhmer ? 'ស្ទើរតែរួចរាល់' : 'Almost ready'}</span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 ring-1 ring-black/[0.04]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0071e3] via-[#38bdf8] to-[#0071e3] shadow-[0_0_12px_rgba(0,113,227,0.4)] transition-all duration-500 ease-out"
              style={{ width: `${Math.max(5, roundedProgress)}%` }}
            />
          </div>
        </div>

        {/* Pipeline Stages Stepper */}
        <div className="mt-8">
          <DeploymentStages t={t} language={language} currentState={currentState} />
        </div>
      </div>

      {/* Terminal Live Activity Log */}
      <DeploymentLog t={t} language={language} details={details} />
    </div>
  );
}
