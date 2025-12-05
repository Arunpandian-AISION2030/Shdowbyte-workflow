import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Workflow, WorkflowNode, NodeType, NodePosition } from '../types';
import { 
  Settings, Play, Database, FileText, Split, Share2, MessageSquare, 
  Mail, Globe, AlertCircle, CheckCircle, Plus, X, GitBranch, Repeat 
} from 'lucide-react';

interface WorkflowCanvasProps {
  workflow: Workflow;
  onNodeSelect: (nodeId: string | null) => void;
  onUpdateNodePosition: (nodeId: string, pos: NodePosition) => void;
  onAddNode: (type: NodeType, position: NodePosition) => void;
  onConnectNodes: (sourceId: string, targetId: string, handleType?: string) => void;
  onDeleteNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  activeNodeId: string | null;
}

const GRID_SIZE = 20;

const NODE_TYPES: { type: NodeType; label: string; icon: React.ReactNode }[] = [
  { type: 'trigger', label: 'Trigger', icon: <Play size={16} /> },
  { type: 'condition', label: 'Condition', icon: <GitBranch size={16} /> },
  { type: 'ai-agent', label: 'AI Agent', icon: <BotIcon size={16} /> },
  { type: 'rag-ai-agent', label: 'RAG Agent', icon: <BotIcon size={16} className="text-yellow-400" /> },
  { type: 'for-each', label: 'Loop', icon: <Repeat size={16} /> },
  { type: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare size={16} /> },
  { type: 'email', label: 'Email', icon: <Mail size={16} /> },
  { type: 'http-request', label: 'HTTP', icon: <Globe size={16} /> },
  { type: 'csv-reader', label: 'CSV Reader', icon: <Database size={16} /> },
  { type: 'log', label: 'Log', icon: <AlertCircle size={16} /> },
];

function BotIcon({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <rect x="5" y="9" width="14" height="10" rx="2" />
      <path d="M8 21v2" />
      <path d="M16 21v2" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}

const getNodeColor = (type: NodeType) => {
  if (type === 'trigger') return 'border-green-500 bg-green-500/10';
  if (type === 'condition') return 'border-orange-500 bg-orange-500/10';
  if (type.includes('ai')) return 'border-purple-500 bg-purple-500/10';
  if (['whatsapp', 'email', 'http-request'].includes(type)) return 'border-blue-500 bg-blue-500/10';
  if (['csv-reader', 'pdf-reader', 'chunk-splitter'].includes(type)) return 'border-yellow-500 bg-yellow-500/10';
  return 'border-gray-600 bg-gray-800';
};

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ 
  workflow, 
  onNodeSelect, 
  onUpdateNodePosition, 
  onAddNode,
  onConnectNodes,
  onDeleteNode,
  selectedNodeId,
  activeNodeId
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Connection state
  const [connectingSource, setConnectingSource] = useState<{ nodeId: string; handle: string, x: number, y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Node Dragging
  const handleMouseDownNode = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    onNodeSelect(node.id);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = Math.round((e.clientX - dragOffset.x) / GRID_SIZE) * GRID_SIZE;
      const newY = Math.round((e.clientY - dragOffset.y) / GRID_SIZE) * GRID_SIZE;
      onUpdateNodePosition(draggingNodeId, { x: newX, y: newY });
    }
    
    // Update mouse pos for drawing temp connection line
    if (connectingSource && canvasRef.current) {
       const rect = canvasRef.current.getBoundingClientRect();
       setMousePos({
         x: e.clientX - rect.left,
         y: e.clientY - rect.top
       });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setDraggingNodeId(null);
    
    // Check if we dropped a connection on a node
    if (connectingSource) {
      // Find if we are over a node
      // Simple collision detection
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Find target node
        const targetNode = workflow.nodes.find(n => 
          x >= n.position.x && x <= n.position.x + 192 && // 192 is w-48
          y >= n.position.y && y <= n.position.y + 80 // approx height
        );

        if (targetNode && targetNode.id !== connectingSource.nodeId) {
          onConnectNodes(connectingSource.nodeId, targetNode.id, connectingSource.handle);
        }
      }
      setConnectingSource(null);
    }
  };

  // Drag and Drop for New Nodes
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType') as NodeType;
    if (type && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) / GRID_SIZE) * GRID_SIZE;
      const y = Math.round((e.clientY - rect.top) / GRID_SIZE) * GRID_SIZE;
      onAddNode(type, { x, y });
    }
  };

  // Keyboard Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        // Prevent deleting if typing in an input (rough check)
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
           onDeleteNode(selectedNodeId);
           onNodeSelect(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, onDeleteNode, onNodeSelect]);


  // Rendering Connections
  const renderConnection = (startX: number, startY: number, endX: number, endY: number, key: string, color = "#4b5563") => {
    const c1x = startX + 50;
    const c1y = startY;
    const c2x = endX - 50;
    const c2y = endY;
    return (
       <path
          key={key}
          d={`M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`}
          stroke={color}
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
    );
  };

  const connections = useMemo(() => {
    const els: React.ReactNode[] = [];

    workflow.nodes.forEach(node => {
      // 1. Standard Next
      if (node.next) {
        const nextNode = workflow.nodes.find(n => n.id === node.next);
        if (nextNode) {
          // Adjust start Y based on handle position
          let startYOffset = 40;
          if (node.type === 'condition') startYOffset = 80; // Default/False is bottom handle? No, let's map specifically below
          if (node.type !== 'condition' && node.type !== 'for-each') {
             els.push(renderConnection(
               node.position.x + 192, node.position.y + 40,
               nextNode.position.x, nextNode.position.y + 40,
               `${node.id}-next`
             ));
          }
        }
      }

      // 2. Condition True/False
      if (node.type === 'condition') {
         if (node.config.on_true) {
            const target = workflow.nodes.find(n => n.id === node.config.on_true);
            if (target) {
               els.push(renderConnection(
                 node.position.x + 192, node.position.y + 30,
                 target.position.x, target.position.y + 40,
                 `${node.id}-true`,
                 "#22c55e"
               ));
            }
         }
         if (node.config.on_false) {
            const target = workflow.nodes.find(n => n.id === node.config.on_false);
            if (target) {
               els.push(renderConnection(
                 node.position.x + 192, node.position.y + 60,
                 target.position.x, target.position.y + 40,
                 `${node.id}-false`,
                 "#ef4444"
               ));
            }
         }
      }

      // 3. Loop Body
      if (node.type === 'for-each') {
         if (node.config.body_start) {
            const target = workflow.nodes.find(n => n.id === node.config.body_start);
            if (target) {
               els.push(renderConnection(
                 node.position.x + 192, node.position.y + 30,
                 target.position.x, target.position.y + 40,
                 `${node.id}-loop`,
                 "#eab308"
               ));
            }
         }
         if (node.next) {
            const target = workflow.nodes.find(n => n.id === node.next);
            if (target) {
               els.push(renderConnection(
                 node.position.x + 192, node.position.y + 60,
                 target.position.x, target.position.y + 40,
                 `${node.id}-loop-next`
               ));
            }
         }
      }

    });
    return els;
  }, [workflow.nodes]);


  // Handle Rendering Helper
  const RenderHandle = ({ nodeId, type, label, top, color = "bg-gray-400" }: { nodeId: string, type: string, label?: string, top: number, color?: string }) => (
     <div 
        className="absolute -right-3 w-4 h-4 flex items-center justify-center cursor-crosshair group z-20"
        style={{ top: `${top}px` }}
        onMouseDown={(e) => {
          e.stopPropagation();
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
             setConnectingSource({ nodeId, handle: type, x: e.clientX - rect.left, y: e.clientY - rect.top });
             setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }}
     >
       <div className={`w-3 h-3 rounded-full border-2 border-gray-900 ${color} group-hover:scale-125 transition-transform`} />
       {label && (
         <div className="absolute right-5 text-[10px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 whitespace-nowrap bg-gray-900 px-1 rounded pointer-events-none">
           {label}
         </div>
       )}
     </div>
  );

  return (
    <div className="flex-1 relative flex h-full">
      {/* Node Palette */}
      <div className="w-14 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-3 z-30 shadow-xl">
         {NODE_TYPES.map((nt) => (
           <div 
             key={nt.type}
             draggable
             onDragStart={(e) => {
               e.dataTransfer.setData('nodeType', nt.type);
             }}
             className="w-10 h-10 rounded bg-gray-800 border border-gray-700 hover:border-purple-500 hover:bg-gray-700 flex items-center justify-center cursor-grab text-gray-400 hover:text-white transition-all"
             title={nt.label}
           >
             {nt.icon}
           </div>
         ))}
      </div>

      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden bg-gray-950 cursor-default"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={() => onNodeSelect(null)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)',
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
        }}
      >
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0">
          <defs>
             <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
               <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
             </marker>
          </defs>
          {connections}
          {/* Temporary Line when dragging */}
          {connectingSource && (
             <line 
                x1={connectingSource.x} 
                y1={connectingSource.y} 
                x2={mousePos.x} 
                y2={mousePos.y} 
                stroke="#a855f7" 
                strokeWidth="2" 
                strokeDasharray="5,5"
             />
          )}
        </svg>

        {workflow.nodes.map(node => (
          <div
            key={node.id}
            className={`absolute w-48 rounded-lg border-2 p-3 shadow-lg select-none transition-shadow z-10 group
              ${getNodeColor(node.type)}
              ${selectedNodeId === node.id ? 'ring-2 ring-white shadow-xl' : ''}
              ${activeNodeId === node.id ? 'ring-2 ring-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]' : ''}
            `}
            style={{
              transform: `translate(${node.position.x}px, ${node.position.y}px)`,
              cursor: 'grab'
            }}
            onMouseDown={(e) => handleMouseDownNode(e, node)}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 text-gray-200 pointer-events-none">
              {NODE_TYPES.find(t => t.type === node.type)?.icon || <Settings size={18} />}
              <span className="font-medium text-sm truncate">{NODE_TYPES.find(t => t.type === node.type)?.label || node.type}</span>
            </div>
            <div className="text-xs text-gray-400 truncate mb-1 pointer-events-none">
              {node.id}
            </div>
            
            {/* Input Handle */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
               <div className="w-3 h-3 bg-gray-700 rounded-full border-2 border-gray-900" />
            </div>

            {/* Output Handles */}
            {node.type === 'condition' ? (
              <>
                <RenderHandle nodeId={node.id} type="true" label="True" top={30} color="bg-green-500" />
                <RenderHandle nodeId={node.id} type="false" label="False" top={60} color="bg-red-500" />
              </>
            ) : node.type === 'for-each' ? (
              <>
                <RenderHandle nodeId={node.id} type="loop" label="Loop" top={30} color="bg-yellow-500" />
                <RenderHandle nodeId={node.id} type="next" label="Done" top={60} />
              </>
            ) : (
                <RenderHandle nodeId={node.id} type="default" top={40} />
            )}

            {/* Quick Actions (Hover) */}
            {selectedNodeId === node.id && (
               <button 
                 className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 rounded-full text-white flex items-center justify-center hover:bg-red-700 shadow-md z-30"
                 onClick={(e) => {
                   e.stopPropagation();
                   onDeleteNode(node.id);
                 }}
               >
                 <X size={12} />
               </button>
            )}

          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowCanvas;