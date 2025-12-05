export type NodeType = 
  | 'trigger' 
  | 'csv-reader' 
  | 'pdf-reader' 
  | 'chunk-splitter' 
  | 'embedding-index' 
  | 'for-each' 
  | 'condition' 
  | 'ai-agent' 
  | 'rag-ai-agent' 
  | 'whatsapp' 
  | 'email' 
  | 'http-request' 
  | 'log' 
  | 'output';

export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  subtype?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
  next?: string | null; // ID of the next node
  position: NodePosition; // Visual position on canvas
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  start_node_id: string;
  nodes: WorkflowNode[];
}

export interface SimulationLog {
  stepId: number;
  timestamp: string;
  nodeId: string;
  nodeType: NodeType;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contextDelta?: Record<string, any>;
}

export interface SimulationState {
  isRunning: boolean;
  logs: SimulationLog[];
  currentStep: number;
}