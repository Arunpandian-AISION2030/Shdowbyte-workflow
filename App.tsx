import React, { useState, useRef } from 'react';
import ChatInterface from './components/ChatInterface';
import WorkflowCanvas from './components/WorkflowCanvas';
import NodeConfigPanel from './components/NodeConfigPanel';
import SimulationPanel from './components/SimulationPanel';
import { Workflow, WorkflowNode, NodePosition, SimulationState, NodeType } from './types';
import { runSimulationStep } from './services/simulationEngine';
import { Layout } from 'lucide-react';

const INITIAL_WORKFLOW: Workflow = {
  id: 'flow-1',
  name: 'New Workflow',
  description: 'Designed by AI',
  start_node_id: 'trigger-1',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      subtype: 'manual',
      config: {},
      position: { x: 100, y: 300 },
      next: 'ai-1'
    },
    {
      id: 'ai-1',
      type: 'ai-agent',
      config: {
        system_prompt: 'Say hello to the world'
      },
      position: { x: 400, y: 300 },
      next: 'log-1'
    },
    {
      id: 'log-1',
      type: 'log',
      config: {
        message: 'Flow finished'
      },
      position: { x: 700, y: 300 },
      next: null
    }
  ]
};

const App: React.FC = () => {
  const [workflow, setWorkflow] = useState<Workflow>(INITIAL_WORKFLOW);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [simPanelExpanded, setSimPanelExpanded] = useState(false);
  
  // Simulation State
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    logs: [],
    currentStep: 0
  });
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simulationContextRef = useRef<any>({});
  const activeNodeIdRef = useRef<string | null>(null);

  const selectedNode = workflow.nodes.find(n => n.id === selectedNodeId) || null;

  const handleUpdateNodePosition = (nodeId: string, pos: NodePosition) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, position: pos } : n)
    }));
  };

  const handleUpdateNode = (updatedNode: WorkflowNode) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
    }));
  };

  const handleAddNode = (type: NodeType, position: NodePosition) => {
    const newNode: WorkflowNode = {
      id: `${type}-${Date.now().toString().slice(-4)}`,
      type,
      position,
      config: {},
      next: null
    };
    
    // Default configs
    if (type === 'condition') {
      newNode.config = { expression: "true" }; // Default expression
    }

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  };

  const handleDeleteNode = (nodeId: string) => {
    setWorkflow(prev => {
      // 1. Remove the node
      const newNodes = prev.nodes.filter(n => n.id !== nodeId);
      
      // 2. Remove references to this node from others
      const cleanedNodes = newNodes.map(node => {
        const newNode = { ...node };
        if (newNode.next === nodeId) newNode.next = null;
        
        // Clean condition/loop specific outputs
        if (node.type === 'condition') {
          if (node.config.on_true === nodeId) newNode.config = { ...node.config, on_true: undefined };
          if (node.config.on_false === nodeId) newNode.config = { ...node.config, on_false: undefined };
        }
        if (node.type === 'for-each') {
          if (node.config.body_start === nodeId) newNode.config = { ...node.config, body_start: undefined };
        }
        
        return newNode;
      });

      return { ...prev, nodes: cleanedNodes };
    });
    
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleConnectNodes = (sourceId: string, targetId: string, handleType: string = 'default') => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => {
        if (node.id === sourceId) {
          // Condition Logic
          if (node.type === 'condition') {
             if (handleType === 'true') {
               return { ...node, config: { ...node.config, on_true: targetId } };
             } else if (handleType === 'false') {
               return { ...node, config: { ...node.config, on_false: targetId } };
             }
          }
          // Loop Logic
          if (node.type === 'for-each') {
             if (handleType === 'loop') {
               return { ...node, config: { ...node.config, body_start: targetId } };
             } else {
               // 'next' or done path
               return { ...node, next: targetId };
             }
          }
          // Default Logic
          return { ...node, next: targetId };
        }
        return node;
      })
    }));
  };

  const startSimulation = () => {
    if (simulationState.isRunning) return;
    setSimPanelExpanded(true);
    setSimulationState({
      isRunning: true,
      logs: [],
      currentStep: 0
    });
    simulationContextRef.current = {};
    activeNodeIdRef.current = workflow.start_node_id;
    runNextStep();
  };

  const runNextStep = async () => {
    if (!activeNodeIdRef.current) {
      setSimulationState(prev => ({ ...prev, isRunning: false }));
      return;
    }

    try {
      const result = await runSimulationStep(
        workflow, 
        activeNodeIdRef.current, 
        simulationContextRef.current, 
        simulationState.logs.length + 1
      );

      simulationContextRef.current = result.newContext;
      
      setSimulationState(prev => ({
        ...prev,
        logs: [...prev.logs, result.log],
        currentStep: prev.currentStep + 1
      }));

      activeNodeIdRef.current = result.nextNodeId;

      if (result.nextNodeId) {
        // Recursive call (in a real app, use a queue or useEffect to control speed)
        requestAnimationFrame(() => runNextStep());
      } else {
        setSimulationState(prev => ({ ...prev, isRunning: false }));
      }
    } catch (e) {
      console.error(e);
      setSimulationState(prev => ({ ...prev, isRunning: false }));
    }
  };

  const stopSimulation = () => {
     setSimulationState(prev => ({ ...prev, isRunning: false }));
     activeNodeIdRef.current = null;
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 text-white overflow-hidden font-sans">
      {/* Top Navigation */}
      <header className="h-14 border-b border-gray-800 flex items-center px-4 bg-gray-900 justify-between shrink-0 z-30">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
             <Layout size={18} className="text-white" />
           </div>
           <h1 className="font-bold text-lg tracking-tight">AutoFlow <span className="text-purple-400 text-xs font-normal border border-purple-500/30 px-1.5 py-0.5 rounded">SIMULATOR</span></h1>
        </div>
        <div className="text-sm text-gray-500">
           {workflow.name}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Chatbot */}
        <ChatInterface onLoadWorkflow={setWorkflow} />

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col relative">
           <WorkflowCanvas 
             workflow={workflow} 
             onNodeSelect={setSelectedNodeId}
             onUpdateNodePosition={handleUpdateNodePosition}
             onAddNode={handleAddNode}
             onConnectNodes={handleConnectNodes}
             onDeleteNode={handleDeleteNode}
             selectedNodeId={selectedNodeId}
             activeNodeId={activeNodeIdRef.current || (simulationState.logs.length > 0 ? simulationState.logs[simulationState.logs.length-1]?.nodeId : null)}
           />
           
           <SimulationPanel 
             simulationState={simulationState}
             onStart={startSimulation}
             onStop={stopSimulation}
             onReset={() => setSimulationState({ isRunning: false, logs: [], currentStep: 0 })}
             expanded={simPanelExpanded}
             onToggleExpand={() => setSimPanelExpanded(!simPanelExpanded)}
           />
        </div>

        {/* Right: Config Panel (Conditional) */}
        {selectedNode && (
          <div className="absolute right-0 top-0 bottom-16 z-10 shadow-2xl">
             <NodeConfigPanel 
               node={selectedNode} 
               onClose={() => setSelectedNodeId(null)} 
               onUpdate={handleUpdateNode}
               onDelete={handleDeleteNode}
             />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;