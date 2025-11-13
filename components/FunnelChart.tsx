
import React from 'react';
import TrendingUpIcon from './icons/TrendingUpIcon';

interface FunnelStage {
  name: string;
  count: number;
}

const FunnelChart = ({ stages }: { stages: FunnelStage[] }) => {
  if (!stages || stages.length < 2) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-500">Dados insuficientes para o funil.</div>;
  }

  return (
    <div className="space-y-2">
      {stages.map((stage, index) => {
        const nextStage = stages[index + 1];
        const conversionRate = nextStage && stage.count > 0 ? (nextStage.count / stage.count) * 100 : null;

        return (
          <React.Fragment key={stage.name}>
            <div className="bg-[#101010] rounded-lg p-4 flex justify-between items-center transition-all hover:shadow-lg hover:ring-1 hover:ring-[#D99B54]/50">
              <div>
                <p className="text-lg font-semibold text-white">{stage.name}</p>
                <p className="text-sm text-gray-400">{stage.count} Leads</p>
              </div>
            </div>
            {nextStage && (
              <div className="flex justify-center items-center my-2">
                <div className="flex items-center text-xs text-green-400 bg-green-900/50 px-2 py-1 rounded-full">
                  <TrendingUpIcon className="w-4 h-4 mr-1" />
                  <span>
                    {conversionRate !== null ? `${conversionRate.toFixed(1)}% de Conversão` : 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default FunnelChart;
