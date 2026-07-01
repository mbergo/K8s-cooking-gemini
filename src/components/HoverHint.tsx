import React, { useState, useRef } from 'react';

const HINTS: Record<string, string> = {
  'GPU': 'Graphics Processing Unit. Used for massively parallel tasks like AI training/inference.',
  'CPU': 'Central Processing Unit. The main processor for general-purpose tasks.',
  'CUDA': 'Compute Unified Device Architecture. A parallel computing platform by NVIDIA.',
  'HPA': 'Horizontal Pod Autoscaler. Automatically scales the number of pods in a deployment.',
  'Scheduler': 'Kube-scheduler assigns newly created pods to nodes based on constraints and resources.',
  'Pods': 'The smallest deployable computing units created and managed in Kubernetes.',
  'TFLOPS': 'Tera Floating-point Operations Per Second. A measure of computer performance.',
  'Node': 'A worker machine in Kubernetes (physical or virtual).',
  'Cluster': 'A set of node machines for running containerized applications.',
  'VRAM': 'Video RAM. Used by GPUs to store neural network weights and activations.',
  'Tensor': 'A multi-dimensional array used in machine learning computations.',
  'Kubernetes': 'An open-source system for automating deployment, scaling, and management of containerized applications.',
  'K8s': 'Abbreviation for Kubernetes.',
  'SRE': 'Site Reliability Engineering. Applies software engineering to operations.',
  'Namespace': 'Provides a mechanism for isolating groups of resources within a single cluster.',
  'Ingress': 'Manages external access to the services in a cluster, typically HTTP.',
};

export const HoverHint: React.FC<{ term: string; children?: React.ReactNode }> = ({ term, children }) => {
  const [show, setShow] = useState(false);
  const hintText = HINTS[term] || HINTS[term.toUpperCase()] || 'A compute concept.';

  return (
    <span 
      className="relative inline-block cursor-help group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="border-b border-dashed border-emerald-400/50 text-emerald-300 font-bold hover:text-emerald-200 transition-colors">
        {children || term}
      </span>
      {show && (
        <div className="absolute z-[9999] bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-emerald-500/30 rounded-lg p-3 shadow-xl pointer-events-none animate-fade-in text-left">
          <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold mb-1">{term}</div>
          <div className="text-xs text-slate-300 leading-relaxed font-sans">{hintText}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 border-t-emerald-500/30"></div>
        </div>
      )}
    </span>
  );
};
