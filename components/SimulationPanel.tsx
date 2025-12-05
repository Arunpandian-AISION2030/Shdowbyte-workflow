import React from 'react';
import { SimulationLog, SimulationState } from '../types';
import { Play, Square, RotateCcw, ChevronUp, ChevronDown, CheckCircle, Clock } from 'lucide-react';

interface SimulationPanelProps {
  simulationState: SimulationState;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ 
  simulationState, 
  onStart, 
  onStop, 
  onReset,
  expanded,
  onToggleExpand
}) => {
  return (
    <div className={`fixed bottom-0 left-96 right-0 bg-gray-900 border-t border-gray-800 transition-all duration-300 z-20 flex flex-col ${expanded ? 'h-96' : 'h-16'}`}>
      
      {/* Header / Controls */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onToggleExpand} className="text-gray-400 hover:text-white">
            {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
          <span className="font-semibold text-white">Simulation Console</span>
          
          <div className="h-6 w-px bg-gray-700 mx-2" />
          
          {!simulationState.isRunning ? (
             <button 
              onClick={onStart}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
            >
              <Play size={14} /> Run Simulation
            </button>
          ) : (
            <button 
              onClick={onStop}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
            >
              <Square size={14} /> Stop
            </button>
          )}

          <button 
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
        
        <div className="text-xs text-gray-500 font-mono">
           Status: {simulationState.isRunning ? 'RUNNING' : 'IDLE'} | Steps: {simulationState.logs.length}
        </div>
      </div>

      {/* Logs Content */}
      <div className="flex-1 overflow-auto p-4 bg-gray-950 font-mono text-sm">
        {simulationState.logs.length === 0 ? (
          <div className="text-gray-600 italic text-center mt-10">No logs yet. Press Run to simulate workflow.</div>
        ) : (
          <div className="space-y-2">
            {simulationState.logs.map((log) => (
              <div key={log.stepId} className="group border-l-2 border-gray-800 pl-3 py-1 hover:bg-gray-900 rounded-r transition-colors">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                   <Clock size={10} />
                   <span>{log.timestamp}</span>
                   <span className="font-bold text-gray-300">[{log.nodeType}]</span>
                   <span>{log.nodeId}</span>
                </div>
                <div className="text-gray-300">
                  {log.message}
                </div>
                {log.contextDelta && Object.keys(log.contextDelta).length > 0 && (
                  <div className="mt-1 bg-gray-900 p-2 rounded text-xs text-green-400 overflow-x-auto">
                    {JSON.stringify(log.contextDelta, null, 2)}
                  </div>
                )}
              </div>
            ))}
            <div id="log-end" />
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationPanel;