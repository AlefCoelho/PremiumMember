"use client";

import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type StrategyTone = "blue" | "green" | "amber" | "red" | "neutral";

type StrategyNodeData = {
  kind: string;
  title: string;
  description: string;
  tone: StrategyTone;
};

type StrategyNode = Node<StrategyNodeData, "strategyNode">;

const nodePresets: Array<{ kind: string; title: string; description: string; tone: StrategyTone }> = [
  { kind: "Gatilho", title: "Novo gatilho", description: "Evento que inicia a estrategia.", tone: "blue" },
  { kind: "Condicao", title: "Nova condicao", description: "Divide o caminho entre sim e nao.", tone: "amber" },
  { kind: "Acao", title: "Nova acao", description: "Executa uma liberacao, bloqueio ou aviso.", tone: "green" },
  { kind: "Pagamento", title: "Pagamento", description: "Valida gateway, PIX ou carteira digital.", tone: "green" },
  { kind: "Espera", title: "Periodo de espera", description: "Mantem a venda em carencia por alguns dias.", tone: "amber" },
  { kind: "Saque", title: "Liberar saque", description: "Abre saldo para PIX ou carteira aprovada.", tone: "blue" },
];

function StrategyNodeCard({ data, selected }: NodeProps<StrategyNode>) {
  return (
    <div className={`flow-node ${data.tone} ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <span>{data.kind}</span>
      <strong>{data.title}</strong>
      <p>{data.description}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  strategyNode: StrategyNodeCard,
};

function readInitialArray<T>(value: string, fallback: T[]) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function StrategyFlowBuilder({
  initialName,
  initialNodesJson,
  initialEdgesJson,
  saveAction,
}: {
  initialName: string;
  initialNodesJson: string;
  initialEdgesJson: string;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [nodes, setNodes, onNodesChange] = useNodesState<StrategyNode>(
    readInitialArray<StrategyNode>(initialNodesJson, [])
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(readInitialArray<Edge>(initialEdgesJson, []));
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id ?? "");
  const nextNodeIndexRef = useRef(nodes.length + 1);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );
  const serializedNodes = useMemo(() => JSON.stringify(nodes), [nodes]);
  const serializedEdges = useMemo(() => JSON.stringify(edges), [edges]);

  function onConnect(connection: Connection) {
    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          type: "smoothstep",
          animated: true,
        },
        currentEdges
      )
    );
  }

  function addPresetNode(preset: (typeof nodePresets)[number]) {
    const nextIndex = nextNodeIndexRef.current;
    nextNodeIndexRef.current += 1;
    const id = `${preset.kind.toLowerCase()}-${nextIndex}`;
    const nextNode: StrategyNode = {
      id,
      type: "strategyNode",
      position: { x: 420 + nodes.length * 42, y: 170 + nodes.length * 28 },
      data: preset,
    };
    setNodes((currentNodes) => [...currentNodes, nextNode]);
    setSelectedNodeId(id);
  }

  function updateSelectedNode(update: Partial<StrategyNodeData>) {
    if (!selectedNode) return;
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                ...update,
              },
            }
          : node
      )
    );
  }

  function removeSelectedNode() {
    if (!selectedNode) return;
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNode.id));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
    );
    setSelectedNodeId("");
  }

  return (
    <section className="panel strategy-builder-panel" id="construtor">
      <div className="panel-header">
        <div>
          <h2>Construtor de estrategia</h2>
          <p>Monte o funil visualmente com blocos conectados, no estilo Flow Builder.</p>
        </div>
        <form action={saveAction} className="flow-save-form">
          <input name="name" type="hidden" value={name} />
          <input name="nodes_json" type="hidden" value={serializedNodes} readOnly />
          <input name="edges_json" type="hidden" value={serializedEdges} readOnly />
          <button className="primary-button flow-save-button" type="submit">
            <Save size={16} />
            Salvar estrategia
          </button>
        </form>
      </div>

      <div className="flow-builder-shell">
        <aside className="flow-palette">
          <label>
            Nome do funil
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="flow-tool-list">
            {nodePresets.map((preset) => (
              <button key={preset.kind} type="button" onClick={() => addPresetNode(preset)}>
                <Plus size={15} />
                {preset.kind}
              </button>
            ))}
          </div>
        </aside>

        <div className="flow-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            onConnect={onConnect}
            onEdgesChange={onEdgesChange}
            onNodesChange={onNodesChange}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>

        <aside className="flow-inspector">
          {selectedNode ? (
            <>
              <div className="flow-inspector-title">
                <div>
                  <span>Bloco selecionado</span>
                  <strong>{selectedNode.data.kind}</strong>
                </div>
                <button type="button" onClick={removeSelectedNode} aria-label="Remover bloco">
                  <Trash2 size={16} />
                </button>
              </div>
              <label>
                Tipo
                <input value={selectedNode.data.kind} onChange={(event) => updateSelectedNode({ kind: event.target.value })} />
              </label>
              <label>
                Titulo
                <input value={selectedNode.data.title} onChange={(event) => updateSelectedNode({ title: event.target.value })} />
              </label>
              <label>
                Descricao
                <textarea
                  rows={4}
                  value={selectedNode.data.description}
                  onChange={(event) => updateSelectedNode({ description: event.target.value })}
                />
              </label>
              <label>
                Cor operacional
                <select
                  value={selectedNode.data.tone}
                  onChange={(event) => updateSelectedNode({ tone: event.target.value as StrategyTone })}
                >
                  <option value="blue">Azul</option>
                  <option value="green">Verde</option>
                  <option value="amber">Amarelo</option>
                  <option value="red">Vermelho</option>
                  <option value="neutral">Neutro</option>
                </select>
              </label>
            </>
          ) : (
            <div className="flow-empty-inspector">
              <strong>Selecione um bloco</strong>
              <p>Clique em qualquer etapa do funil para ajustar titulo, descricao e cor.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
