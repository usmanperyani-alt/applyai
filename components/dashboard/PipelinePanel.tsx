import { PipelineStage } from "@/types";

interface PipelinePanelProps {
  stages: PipelineStage[];
}

export default function PipelinePanel({ stages }: PipelinePanelProps) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      <div className="px-3.5 py-3 border-b border-card-border">
        <span className="text-[13px] font-medium">Application pipeline</span>
      </div>
      <div className="py-2">
        {stages.map((stage) => (
          <div key={stage.label} className="px-3.5 py-2 flex items-center justify-between">
            <span className="text-[11px] text-text-secondary w-20">{stage.label}</span>
            <div className="flex-1 h-[5px] bg-page-bg rounded-[3px] mx-2.5 overflow-hidden">
              <div
                className="h-full rounded-[3px]"
                style={{
                  width: `${(stage.count / stage.max) * 100}%`,
                  background: stage.color,
                }}
              />
            </div>
            <span className="text-xs font-medium w-5 text-right">{stage.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
