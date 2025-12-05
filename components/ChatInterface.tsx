import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, PlayCircle, Loader2 } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { Workflow } from '../types';

interface ChatInterfaceProps {
  onLoadWorkflow: (workflow: Workflow) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hasJson?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onLoadWorkflow }) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: "Hello! I'm your AutoFlow architect. Describe a workflow you need, and I'll design it for you." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const extractJson = (text: string): Workflow | null => {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Failed to parse JSON from AI", e);
      }
    }
    return null;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const responseText = await sendMessageToGemini(input);
    const workflow = extractJson(responseText);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: responseText.replace(/```json[\s\S]*?```/, '[Workflow JSON Generated]'),
      hasJson: !!workflow
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);

    if (workflow) {
      // Auto-inject position data if missing for visualization
      const positionedNodes = workflow.nodes.map((node, index) => ({
        ...node,
        position: node.position || { x: 100 + (index * 200), y: 150 + (index % 2 === 0 ? 0 : 50) }
      }));
      onLoadWorkflow({ ...workflow, nodes: positionedNodes });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 w-96 flex-shrink-0">
      <div className="p-4 border-b border-gray-800 flex items-center gap-2">
        <Bot className="text-purple-400" size={24} />
        <h2 className="font-semibold text-white">AI Architect</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-gray-800 text-white' : 'bg-gray-800/50 text-gray-200 border border-gray-700'}`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.hasJson && (
                <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                  <PlayCircle size={12} /> Workflow loaded to canvas
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin" />
            </div>
            <div className="p-3 bg-gray-800/50 rounded-lg text-sm text-gray-400 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a workflow..."
            className="w-full bg-gray-800 text-white rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none h-24"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute bottom-3 right-3 p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;