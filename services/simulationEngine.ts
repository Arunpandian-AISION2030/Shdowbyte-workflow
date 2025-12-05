import { Workflow, SimulationLog, WorkflowNode } from '../types';

// Helper to resolve simple template strings like {{row.email}}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resolveTemplate = (template: string, context: any): string => {
  if (typeof template !== 'string') return String(template);
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const parts = key.split('.');
    let value = context;
    for (const part of parts) {
      value = value ? value[part] : undefined;
    }
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
};

export const runSimulationStep = async (
  workflow: Workflow,
  currentNodeId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  stepCount: number
): Promise<{ nextNodeId: string | null; log: SimulationLog; newContext: any }> => {
  
  if (!currentNodeId) {
    throw new Error("Simulation ended unexpectedly.");
  }

  const node = workflow.nodes.find(n => n.id === currentNodeId);
  if (!node) {
    return {
      nextNodeId: null,
      log: {
        stepId: stepCount,
        timestamp: new Date().toISOString(),
        nodeId: currentNodeId,
        nodeType: 'log', // Fallback
        message: `Error: Node ${currentNodeId} not found.`
      },
      newContext: context
    };
  }

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 800));

  let logMessage = `Executed ${node.type}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contextDelta: any = {};
  let nextNodeId = node.next || null;

  // Node Logic Simulation
  switch (node.type) {
    case 'trigger':
      logMessage = `Trigger activated (${node.subtype || 'manual'})`;
      contextDelta['trigger'] = { startedAt: new Date().toISOString(), input: "Simulated User Input" };
      break;

    case 'condition':
      // Simple evaluation mock
      const expression = node.config.expression || "true";
      // In a real app, use a safe evaluator. Here we just mock random or check simple context
      const isTrue = Math.random() > 0.5; // Mock decision for now, or try to eval
      
      logMessage = `Condition evaluated: ${expression} -> ${isTrue}`;
      nextNodeId = isTrue ? node.config.on_true : node.config.on_false;
      break;

    case 'csv-reader':
      logMessage = `Read CSV file. Found 3 rows.`;
      contextDelta[`csv-reader::${node.id}`] = {
        rows: [
          { name: "Alice", email: "alice@example.com", phone: "+1234567890", product: "Pro Plan" },
          { name: "Bob", email: "bob@example.com", phone: "+1987654321", product: "Starter Plan" },
          { name: "Charlie", email: "charlie@example.com", phone: "+1122334455", product: "Enterprise Plan" }
        ]
      };
      break;

    case 'ai-agent':
      const prompt = resolveTemplate(node.config.system_prompt || "Process input", context);
      logMessage = `AI Agent processed prompt: "${prompt.substring(0, 30)}..."`;
      contextDelta[`ai-agent::${node.id}`] = {
        text: "This is a simulated AI response based on local LLaMA model behavior."
      };
      break;

    case 'rag-ai-agent':
      logMessage = `RAG Agent retrieved 3 chunks and generated answer.`;
      contextDelta[`rag-ai-agent::${node.id}`] = {
        answer: "Based on the PDF, the policy states that refunds are processed within 5 days.",
        used_chunks: ["chunk_1", "chunk_5"]
      };
      break;

    case 'whatsapp':
    case 'email':
      const content = resolveTemplate(node.config.message_template || node.config.body_template || "", context);
      logMessage = `Generated ${node.type} message (Simulated): "${content.substring(0, 40)}..."`;
      contextDelta[`${node.type}::${node.id}`] = {
        status: "simulated_send",
        content: content,
        recipient: resolveTemplate(node.config.to || "", context)
      };
      break;
    
    case 'for-each':
       logMessage = `Iterator check.`;
       // Simple loop logic: if we haven't visited body_start recently in stack, go there.
       // For this simple sim, we just go to body_start once.
       if (node.config.body_start) {
          nextNodeId = node.config.body_start;
          contextDelta['row'] = { name: "Alice", email: "alice@example.com", phone: "+1234567890" }; // Mock current item
       }
       break;

    default:
      logMessage = `Executed node ${node.id}`;
      break;
  }

  const newContext = { ...context, ...contextDelta };

  return {
    nextNodeId,
    log: {
      stepId: stepCount,
      timestamp: new Date().toLocaleTimeString(),
      nodeId: node.id,
      nodeType: node.type,
      message: logMessage,
      contextDelta
    },
    newContext
  };
};