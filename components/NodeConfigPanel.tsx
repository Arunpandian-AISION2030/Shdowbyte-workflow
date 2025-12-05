import React from 'react';
import { WorkflowNode } from '../types';
import { X, Trash2 } from 'lucide-react';

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  onClose: () => void;
  onUpdate: (updatedNode: WorkflowNode) => void;
  onDelete?: (nodeId: string) => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose, onUpdate, onDelete }) => {
  if (!node) return null;

  const handleChange = (key: string, value: any) => {
    onUpdate({
      ...node,
      config: {
        ...node.config,
        [key]: value
      }
    });
  };

  const handleBaseChange = (key: keyof WorkflowNode, value: any) => {
    onUpdate({
      ...node,
      [key]: value
    });
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h3 className="font-semibold text-white">Node Configuration</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Basic Info */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-400 uppercase">Node ID</label>
          <input
            type="text"
            value={node.id}
            disabled
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
          />
        </div>

        {/* Dynamic Config Fields based on Type */}
        <div className="border-t border-gray-800 pt-4 space-y-4">
          <h4 className="text-sm font-medium text-white">Properties</h4>

          {node.type === 'trigger' && (
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Trigger Type</label>
              <select 
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                value={node.subtype || 'manual'}
                onChange={(e) => handleBaseChange('subtype', e.target.value)}
              >
                <option value="manual">Manual</option>
                <option value="webhook">Webhook</option>
                <option value="schedule">Schedule</option>
              </select>
            </div>
          )}

          {node.type === 'condition' && (
             <div className="space-y-2">
               <label className="text-xs text-gray-400">Expression (JS)</label>
               <input
                 type="text"
                 value={node.config.expression || ''}
                 onChange={(e) => handleChange('expression', e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                 placeholder="row.status == 'active'"
               />
               <p className="text-[10px] text-gray-500">Connect True/False outputs in canvas.</p>
             </div>
          )}

          {node.type.includes('ai-agent') && (
            <>
               <div className="space-y-2">
                <label className="text-xs text-gray-400">System Prompt</label>
                <textarea
                  rows={4}
                  value={node.config.system_prompt || ''}
                  onChange={(e) => handleChange('system_prompt', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                  placeholder="You are a helpful assistant..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Model</label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                  value={node.config.model || 'llama3'}
                  onChange={(e) => handleChange('model', e.target.value)}
                >
                  <option value="llama3">Llama 3 (Local)</option>
                  <option value="mistral">Mistral (Local)</option>
                  <option value="gpt-4">GPT-4 (OpenAI)</option>
                </select>
              </div>
            </>
          )}

          {['whatsapp', 'email'].includes(node.type) && (
            <>
               <div className="space-y-2">
                <label className="text-xs text-gray-400">Recipient (Template)</label>
                <input
                  type="text"
                  value={node.config.to || ''}
                  onChange={(e) => handleChange('to', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  placeholder="{{row.email}}"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Template Body</label>
                <textarea
                  rows={4}
                  value={node.config.message_template || node.config.body_template || ''}
                  onChange={(e) => handleChange(node.type === 'whatsapp' ? 'message_template' : 'body_template', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white outline-none"
                  placeholder="Hello {{row.name}}..."
                />
              </div>
            </>
          )}

           {node.type === 'rag-ai-agent' && (
            <div className="space-y-2">
                <label className="text-xs text-gray-400">Index ID</label>
                <input
                  type="text"
                  value={node.config.index_id || ''}
                  onChange={(e) => handleChange('index_id', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                />
            </div>
          )}
        </div>
      </div>

      {onDelete && (
        <div className="p-4 border-t border-gray-800">
           <button 
             onClick={() => onDelete(node.id)}
             className="w-full flex items-center justify-center gap-2 py-2 bg-red-900/30 text-red-400 border border-red-900 hover:bg-red-900/50 rounded transition-colors"
           >
             <Trash2 size={16} /> Delete Node
           </button>
        </div>
      )}
    </div>
  );
};

export default NodeConfigPanel;