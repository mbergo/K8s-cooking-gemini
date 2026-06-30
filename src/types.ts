export type Tab =
  | 'overview'
  | 'architecture'
  | 'cluster-map'
  | 'scheduler'
  | 'gpu-stack'
  | 'lifecycle'
  | 'troubleshooting'
  | 'calculator'
  | 'comparison'
  | 'qa'
  | 'classroom-meet';

export interface ComponentInfo {
  name: string;
  category: 'control-plane' | 'worker-node' | 'network' | 'storage' | 'ai-stack';
  description: string;
  responsibilities: string[];
  connections: { target: string; type: string }[];
  failureModes: { symptom: string; detection: string; resolution: string }[];
  interviewTip: string;
}

export interface SchedulerStep {
  name: string;
  phase: 'Scheduling Cycle' | 'Binding Cycle' | 'Pre-Filter';
  description: string;
  substeps: string[];
  formulaOrRule: string;
}

export interface GPUStackLayer {
  name: string;
  type: 'software' | 'library' | 'driver' | 'hardware' | 'silicon';
  description: string;
  howItWorks: string;
  keyMetricOrAPI: string;
  interviewInsight: string;
}

export interface LifecycleStep {
  step: number;
  name: string;
  component: string;
  layer: 'Network & Gateway' | 'Kubernetes Control Plane' | 'AI serving' | 'GPU execution' | 'Metrics & Operations';
  description: string;
  whatHappens: string;
  failureRisk: string;
  observabilityTip: string;
}

export interface DebugScenario {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  symptom: string;
  initialStatus: string;
  mockTerminalCommand: string;
  expectedOutput: string;
  solutionCommand: string;
  remediation: string;
  remediationOutput: string;
  explanation: string;
}

export interface CloudProviderData {
  provider: string;
  managedK8s: string;
  nodePools: string;
  gpuInstances: string;
  storageService: string;
  autoscaling: string;
  identityAuth: string;
  networkEFA: string;
  observability: string;
  keyLimitation: string;
}

export interface QAData {
  id: string;
  category: 'recruiter' | 'technical' | 'senior-staff' | 'principal';
  question: string;
  recruiterAnswer?: string;
  technicalAnswer?: string;
  staffInsight: string;
  whiteboardLayout?: string;
}

export const K8S_COMPONENTS: Record<string, ComponentInfo> = {
  'api-server': {
    name: 'kube-apiserver',
    category: 'control-plane',
    description: 'The front-end of the Kubernetes control plane. Exposes the Kubernetes API, accepts all requests, authenticates, authorizes (RBAC), and writes state directly to etcd.',
    responsibilities: [
      'Acts as the entry point for all administrative, deployment, and operational requests.',
      'Performs TLS termination, user authentication, and RBAC authorization.',
      'Executes admission controllers (both Mutating and Validating webhooks) to secure and validate manifests.',
      'Maintains optimistic concurrency control on resources'
    ],
    connections: [
      { target: 'etcd', type: 'Writes state updates' },
      { target: 'scheduler', type: 'Watches for unscheduled Pods' },
      { target: 'kubelet', type: 'Sends pod execution specs' }
    ],
    failureModes: [
      {
        symptom: 'API server timeout / HTTP 504',
        detection: 'apiserver_request_duration_seconds metrics skyrocketing; API completely unresponsive.',
        resolution: 'Scale up API server replicas, check etcd disk latencies, or optimize mutating webhooks causing deadlocks.'
      }
    ],
    interviewTip: 'Always mention that kube-apiserver is the ONLY control plane component that directly reads from or writes to etcd. No other component talks directly to etcd.'
  },
  'etcd': {
    name: 'etcd',
    category: 'control-plane',
    description: 'Consistent, highly-available key-value store. Serves as Kubernetes\' backing store for all cluster data.',
    responsibilities: [
      'Persists all Kubernetes object configurations, cluster states, and active events.',
      'Implements the Raft consensus algorithm to guarantee consistency across control plane replicas.',
      'Provides watch APIs so controllers can react instantly to state changes.'
    ],
    connections: [
      { target: 'api-server', type: 'Reads and writes only with apiserver' }
    ],
    failureModes: [
      {
        symptom: 'Cluster API is frozen; read-only mode or split-brain',
        detection: 'etcd_disk_wal_write_duration_seconds > 10ms; Raft leader elections failing.',
        resolution: 'Provision high-IOPS SSDs for etcd write-ahead logs (WAL). Never colocate etcd disk with high-write application storage.'
      }
    ],
    interviewTip: 'SRE interviewers love etcd disk latency discussions. Disk write latency is the most common cause of etcd leader election loops, which freezes the entire control plane.'
  },
  'scheduler': {
    name: 'kube-scheduler',
    category: 'control-plane',
    description: 'Watches for newly created Pods with no assigned node, filters out ineligible nodes, scores remaining nodes based on affinity, taints, and GPU availability, and assigns the Pod.',
    responsibilities: [
      'Executes Filtering phase to eliminate nodes without requested resources (e.g., requested GPUs, memory, CPU).',
      'Executes Scoring phase to prioritize nodes with good topology, locality, and low resource fragmentation.',
      'Implements the scheduling framework extension points for custom GPU schedulers (like Volcano or Kueue).'
    ],
    connections: [
      { target: 'api-server', type: 'Binds pods to nodes by patching Pod objects' }
    ],
    failureModes: [
      {
        symptom: 'AI Pods stuck in "Pending" status indefinitely',
        detection: 'Pod events show "0/12 nodes are available: 12 Insufficient nvidia.com/gpu."',
        resolution: 'Trigger Karpenter to spin up new GPU node-pools, or check if GPU taints prevent scheduling.'
      }
    ],
    interviewTip: 'For AI compute, the default scheduler can cause high fragmentation. Mentioning multi-node gang-scheduling (Volcano/Kueue) for LLM training immediately shows Senior Staff maturity.'
  },
  'kubelet': {
    name: 'Kubelet',
    category: 'worker-node',
    description: 'An agent that runs on each node in the cluster. It ensures that containers described in PodSpecs are running and healthy.',
    responsibilities: [
      'Registers the node with the API server, advertising its GPU, CPU, and Memory capacity.',
      'Interacts with the Container Runtime Interface (CRI) to pull images and start containers.',
      'Executes Liveness, Readiness, and Startup probes to verify container health.',
      'Invokes CNI and CSI plugins to attach networking and mount volumes.'
    ],
    connections: [
      { target: 'api-server', type: 'Reports node heartbeats and Pod status changes' },
      { target: 'container-runtime', type: 'Instructs CRI to pull images and create containers' }
    ],
    failureModes: [
      {
        symptom: 'Node enters "NotReady" status',
        detection: 'API Server reports NodeStatusNotReady; pods scheduled to node are evicted.',
        resolution: 'Check for system OOM (Out Of Memory) killing the kubelet process, disk pressure, or dockershim/containerd crashes.'
      }
    ],
    interviewTip: 'When discussing GPUs, emphasize that kubelet communicates with the NVIDIA Container Runtime via CRI to mount GPU device nodes (/dev/nvidia*) directly inside the container.'
  },
  'cni': {
    name: 'Container Network Interface (CNI)',
    category: 'network',
    description: 'Responsible for allocating IP addresses, configuring routing, and securing container-to-container network communication (using Calico, Cilium, or Flannel).',
    responsibilities: [
      'Assigns unique Pod IP addresses inside the pod namespace.',
      'Configures virtual ethernet (veth) pairs on the host.',
      'Implements Network Policies using iptables (Calico) or eBPF (Cilium) to isolate network namespaces.',
      'Enables high-bandwidth inter-node communication via GPUDirect RDMA or InfiniBand.'
    ],
    connections: [
      { target: 'kubelet', type: 'Invoked during Pod sandbox creation' }
    ],
    failureModes: [
      {
        symptom: 'Pods stuck in ContainerCreating; CNI IP AM failures',
        detection: 'Events show "failed to delegate: Address Space Exhausted."',
        resolution: 'Expand the CIDR range allocated to the CNI node-pools or recycle idle Node IPs.'
      }
    ],
    interviewTip: 'Cilium with eBPF is highly preferred for GPU workloads because it bypasses the Linux kernel\'s slow iptables routing, reducing latency for distributed training (NCCL).'
  },
  'csi': {
    name: 'Container Storage Interface (CSI)',
    category: 'storage',
    description: 'Exposes block and file storage systems to containerized workloads (AWS EBS, GCP Hyperdisk, Azure Managed Disks, Shared FSx).',
    responsibilities: [
      'Attaches cloud disk volumes to virtual machines dynamically.',
      'Formats and mounts file systems inside the Pod directory.',
      'Manages high-speed SSD caching for quick model weight downloads.'
    ],
    connections: [
      { target: 'kubelet', type: 'Invoked to mount and unmount directories' }
    ],
    failureModes: [
      {
        symptom: 'Pod stuck in "ContainerCreating" with VolumeAttachment error',
        detection: 'Events show "Volume is already attached to another node and cannot be detached."',
        resolution: 'Force delete the stale VolumeAttachment object or trigger Karpenter to schedule the Pod on the original node.'
      }
    ],
    interviewTip: 'LLM weights can be 100GB+. Talk about model caching using Local SSDs or high-throughput Lustre/FSx volumes to keep Pod startup times below 1 minute instead of downloading on every Pod start.'
  }
};

export const SCHEDULER_STEPS: SchedulerStep[] = [
  {
    name: 'QueueSort',
    phase: 'Pre-Filter',
    description: 'Prioritizes Pods inside the scheduling queue based on priority classes, creation time, or backoff loops.',
    substeps: [
      'Active Queue holds pods ready for scheduling.',
      'Unschedulable Queue holds pods that previously failed requirements.',
      'Backoff Queue holds pods waiting for exponential backoff before retrying.'
    ],
    formulaOrRule: 'PriorityClass.Value (Higher = Scheduled First)'
  },
  {
    name: 'Filter',
    phase: 'Scheduling Cycle',
    description: 'Eliminates nodes that cannot run the Pod. It performs resource checks, taints, tolerations, and node selector evaluations.',
    substeps: [
      'NodeResourceFit: Checks if CPU, Memory, and extended resources (nvidia.com/gpu) are available.',
      'NodePorts: Checks if requested host ports are free.',
      'PodTopologySpread: Evaluates node zones to spread workloads safely.',
      'Tolerations: Confirms Pod can tolerate node taints.'
    ],
    formulaOrRule: 'Nodes.filter(node => node.FreeGPU >= pod.RequestedGPU)'
  },
  {
    name: 'Score',
    phase: 'Scheduling Cycle',
    description: 'Ranks the remaining nodes on a scale from 0 to 100 to find the most optimal host.',
    substeps: [
      'ImageLocality: Awards higher scores to nodes that already have the model container images cached.',
      'NodeAffinity: Rates nodes based on preferred (soft) scheduling constraints.',
      'GPU Topology / PCIe Locality: Prioritizes collocating multi-GPU pods on nodes with shared PCIe root complexes or NVLink to bypass CPU system memory.'
    ],
    formulaOrRule: 'Score = sum(Weight_i * Score_i) / sum(Weights)'
  },
  {
    name: 'Reserve',
    phase: 'Scheduling Cycle',
    description: 'Optimistically locks resources on the selected node before writing state to etcd, preventing race conditions (double allocation).',
    substeps: [
      'Locks the memory and GPU device mapping on the scheduler’s local memory cache.',
      'Ensures no other thread assigns another Pod to this node\'s reserved capacity.'
    ],
    formulaOrRule: 'Node.ReservedCapacity += Pod.Requests'
  },
  {
    name: 'Bind',
    phase: 'Binding Cycle',
    description: 'Asynchronously sends a binding request to the API Server, setting the target Node name on the Pod Specification.',
    substeps: [
      'API Server persists the binding in etcd.',
      'The target Kubelet watches the API server, sees the binding, and begins execution.'
    ],
    formulaOrRule: 'Pod.Spec.NodeName = TargetNode'
  }
];

export const GPU_STACK: GPUStackLayer[] = [
  {
    name: 'AI Application / PyTorch',
    type: 'software',
    description: 'High-level neural network framework where the model architecture, weights, and layers are declared.',
    howItWorks: 'Translates high-level operations (e.g. forward pass of linear layer) into tensor structures (Multidimensional Arrays). Under the hood, PyTorch dynamically generates a graph of executions and hands them down to the CUDA Runtime.',
    keyMetricOrAPI: 'torch.cuda.is_available(), tensor.to(\'cuda\')',
    interviewInsight: 'Explain that PyTorch is primarily an orchestrator of tensors; it does not actually run the math on the CPU or GPU directly. It delegates the mathematical graphs to specialized CUDA libraries.'
  },
  {
    name: 'CUDA Runtime & cuBLAS / cuDNN',
    type: 'library',
    description: 'The developer-facing CUDA API layer and heavily optimized mathematics libraries built by NVIDIA.',
    howItWorks: 'Provides standard memory allocation (cudaMalloc), host-to-device memory copies (cudaMemcpy), and execution scheduling APIs. Deep learning relies on cuBLAS for dense matrix multiplication (GEMM) and cuDNN for convolutional layers.',
    keyMetricOrAPI: 'cudaMalloc(), cuBLAS GEMM kernels',
    interviewInsight: 'Interviewers love when you distinguish between CUDA Runtime (libcuda.rt) and CUDA Driver (libcuda). PyTorch binds dynamically to the runtime, which is simpler and handles context initialization automatically.'
  },
  {
    name: 'CUDA Driver',
    type: 'driver',
    description: 'The low-level driver interface communicating directly with the GPU hardware controller and OS kernel.',
    howItWorks: 'Creates and manages the CUDA Context (analogous to virtual address space). Loads CUDA kernels (PTX files), manages the GPU hardware page tables, and oversees asynchronous streams for scheduling work packets.',
    keyMetricOrAPI: 'cuCtxCreate(), cuMemAlloc()',
    interviewInsight: 'The CUDA driver is installed alongside the NVIDIA kernel driver on the host. When running in Kubernetes, the container uses the host driver through mounts facilitated by the NVIDIA Container Toolkit.'
  },
  {
    name: 'PCIe / NVLink',
    type: 'hardware',
    description: 'The physical high-speed interconnect bus connecting the CPU/system RAM to the GPU VRAM.',
    howItWorks: 'Transfers prompt tensors from CPU system memory to GPU HBM (VRAM). PCIe Gen 4 provides 32GB/s; PCIe Gen 5 provides 64GB/s. NVLink provides direct GPU-to-GPU interconnect up to 900GB/s on H100, bypassing the CPU completely.',
    keyMetricOrAPI: 'PCIe Bandwidth (GB/s), NVLink P2P (Peer-to-Peer)',
    interviewInsight: 'Always emphasize that the PCIe bus is the major bottleneck for real-time inference (Prefill phase). Utilizing GPUDirect RDMA or NVLink to copy data directly from network interface cards (NICs) to GPU memory bypasses CPU system memory entirely.'
  },
  {
    name: 'GPU High-Bandwidth Memory (HBM/VRAM)',
    type: 'hardware',
    description: 'Ultra-fast memory built directly onto the GPU silicon package, providing terabytes of memory bandwidth.',
    howItWorks: 'Holds model weights, active gradients, the KV (Key-Value) Cache, and intermediate activations. H100 GPU VRAM runs at approximately 3.35 TB/s, which is 50x faster than traditional CPU DDR5 system memory.',
    keyMetricOrAPI: 'VRAM utilization (%), Memory Bandwidth (TB/s)',
    interviewInsight: 'In LLM inference, memory bandwidth is the primary bottleneck during the Generation phase. Because each token generation step requires reloading all model weights from VRAM to the processor, we are "memory-bandwidth bound" rather than "compute-bound."'
  },
  {
    name: 'Streaming Multiprocessors (SM)',
    type: 'silicon',
    description: 'The parallel processing units of the GPU. An H100 contains 114 to 132 SMs.',
    howItWorks: 'An SM receives work in groups of 32 parallel threads called a "Warp." The Warp Scheduler within the SM schedules instructions in a SIMT (Single Instruction, Multiple Threads) fashion, dispatching computations to integer, floating-point, or Tensor Cores.',
    keyMetricOrAPI: 'SM Occupancy (%), Warp Active Cycles',
    interviewInsight: 'Warp divergence occurs when threads inside a Warp take different execution branches. This kills parallel efficiency because the SM must serialize the branches. Writing "divergence-free" kernel graphs is a hallmark of Staff engineers.'
  },
  {
    name: 'Tensor Cores',
    type: 'silicon',
    description: 'Specialized hardware units inside the SM designed explicitly for accelerating matrix multiplication (GEMM).',
    howItWorks: 'Executes a complete matrix multiply-accumulate operation (D = A * B + C) in a single clock cycle. It supports FP16, BF16, and FP8 precision, enabling astronomical acceleration of deep learning operations.',
    keyMetricOrAPI: 'TFLOPS (Tensor Floating Point Operations per Second)',
    interviewInsight: 'Tensor Cores are why mixed-precision (FP16/BF16) and quantization (FP8, INT4) are so popular. By using lower precision, you fit more values into Tensor Cores per clock cycle and reduce memory bandwidth saturation.'
  }
];

export const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    step: 1,
    name: 'User Search Request',
    component: 'Global Load Balancer',
    layer: 'Network & Gateway',
    description: 'The user enters their prompt: "Pet-friendly beach house in Rio with fast Wi-Fi."',
    whatHappens: 'The Global Load Balancer routes the HTTPS request to the nearest available cloud region and forwards it to the API Gateway.',
    failureRisk: 'DNS resolution issues, DDoS attacks, or geographical failover delays.',
    observabilityTip: 'Monitor round-trip time (RTT) and geographical edge latency.'
  },
  {
    step: 2,
    name: 'Gateway Route & Decryption',
    component: 'API Gateway & Ingress',
    layer: 'Network & Gateway',
    description: 'Terminates TLS, validates session, and checks rate limits.',
    whatHappens: 'The API Gateway decrypts the SSL traffic, verifies user JWT tokens, enforces rate limiting quotas, and routes the search to the Recommendation Orchestrator.',
    failureRisk: 'Rate limiting misconfigurations causing false HTTP 429s, or JWT verification timeout due to identity provider outages.',
    observabilityTip: 'Track edge requests per second (RPS), auth latency, and HTTP error rate (4xx/5xx).'
  },
  {
    step: 3,
    name: 'Service Discovery',
    component: 'Kubernetes Ingress & CoreDNS',
    layer: 'Kubernetes Ingress',
    1: 'Service'
  } as any, // Typed as any to handle custom lifecycle indexing smoothly
  {
    step: 4,
    name: 'Semantic Caching Check',
    component: 'Semantic Cache (Redis/DynamoDB)',
    layer: 'AI serving',
    description: 'Inspects if an identical or highly similar search has been processed recently.',
    whatHappens: 'Calculates the semantic similarity of the prompt against cached queries. If similarity is >95%, it bypasses model execution entirely and returns the cached search results instantly.',
    failureRisk: 'Cache exhaustion, Redis connection pool exhaustion, or returning stale listings if inventory has changed.',
    observabilityTip: 'Monitor Cache Hit Ratio (%) and Redis command latency (ms).'
  },
  {
    step: 5,
    name: 'Vector Search & Context Retrieval',
    component: 'Vector Database (Qdrant/Milvus)',
    layer: 'AI serving',
    description: 'Fetches relevant beach house inventory and reviews from the vector DB.',
    whatHappens: 'The query embedding is sent to the vector database. It executes a Cosine or Euclidean nearest-neighbor search to retrieve listings that explicitly mention "beachfront," "pets allowed," and "fast Wi-Fi" in Rio.',
    failureRisk: 'Slow query execution due to unindexed vector spaces or HNSW index fragmentation.',
    observabilityTip: 'Measure query execution latency (p99) and recall accuracy.'
  },
  {
    step: 6,
    name: 'Prompt Augmentation & LLM Gateway',
    component: 'Prompt Builder & LLM Gateway',
    layer: 'AI serving',
    description: 'Assembles the final prompt and routes to the model cluster.',
    whatHappens: 'Combines the user\'s original query with the retrieved listings and system guidelines into a highly structured prompt context. The LLM Gateway applies safety filtering and schedules the request to a vLLM serving pool.',
    failureRisk: 'Context window saturation (prompt too long) or LLM Gateway queue exhaustion.',
    observabilityTip: 'Monitor Queue Depth, prompt token size, and gateway routing times.'
  },
  {
    step: 7,
    name: 'Continuous Batching & KV Caching',
    component: 'vLLM Serving Engine',
    layer: 'AI serving',
    description: 'Batches the search request with others and checks for cached keys.',
    whatHappens: 'vLLM dynamically merges this request into an active processing batch. It utilizes Paged Attention to allocate non-contiguous VRAM pages for the request\'s KV Cache, saving memory and preventing fragmentation.',
    failureRisk: 'VRAM exhaustion, out-of-memory crashes due to excessive concurrent context allocations.',
    observabilityTip: 'Monitor KV Cache usage (%), active batch size, and Time to First Token (TTFT).'
  },
  {
    step: 8,
    name: 'Kubernetes Scheduling & Pod Placement',
    component: 'Kubernetes Scheduler',
    layer: 'Kubernetes Control Plane',
    description: 'Finds an optimal GPU node if the scaling engine triggered a new replica.',
    whatHappens: 'If serving instances need to scale out to handle peak load, the scheduler matches the new pod\'s requirements (e.g. nvidia.com/gpu: 1, node affinity, taints) and binds it to a healthy GPU node.',
    failureRisk: 'Pod stuck in Pending due to lack of available GPU hardware resources in the cloud provider.',
    observabilityTip: 'Measure scheduling latency (ms) and pod-pending count.'
  },
  {
    step: 9,
    name: 'GPU Device Mounting & CRI',
    component: 'Kubelet & containerd',
    layer: 'Kubernetes Control Plane',
    description: 'Initializes the pod container with direct access to GPU hardware resources.',
    whatHappens: 'The kubelet invokes the container runtime. It utilizes the NVIDIA Container Toolkit to map host GPU device files (/dev/nvidia*) and driver libraries directly inside the container namespace.',
    failureRisk: 'Missing host drivers, library version mismatches (e.g., driver too old for CUDA runtime).',
    observabilityTip: 'Audit kubelet CRI errors and container startup times.'
  },
  {
    step: 10,
    name: 'Memory Allocation & CUDA Context',
    component: 'CUDA Driver & Runtime',
    layer: 'GPU execution',
    description: 'Creates a secure context and allocates memory on the physical GPU.',
    whatHappens: 'The driver initializes a CUDA context for the vLLM process. It executes cudaMalloc to allocate VRAM buffers for the model weights, KV Cache pages, and calculation workspace.',
    failureRisk: 'CUDA Out Of Memory (OOM) error due to oversized KV cache page configurations.',
    observabilityTip: 'Monitor physical GPU VRAM allocation and free memory blocks.'
  },
  {
    step: 11,
    name: 'PCIe Transfer & Kernel Launches',
    component: 'PCIe Bus & Warp Schedulers',
    mata: 'CPU copies the tokenized prompt tensors to GPU VRAM across the PCIe bus.',
    We: 'will trace the PCIe transfer.',
    description: 'The CPU copy-streams token tensors across PCIe into the GPU' +
                 ' VRAM using DMA. Once completed, the CPU launches CUDA kernels, scheduling' +
                 ' thousands of thread groups (warps) across the Streaming Multiprocessors.'
  },
  {
    step: 12,
    topic: 'Tensor Core Math',
    component: 'Tensor Cores & SMs',
    layer: 'GPU execution',
    description: 'Executes parallel matrix-multiplications to calculate listing rankings.',
    whatHappens: 'The physical SMs execute parallel calculations. Tensor Cores perform astronomical multiply-accumulate operations in half-precision (BF16) or quantized FP8 to rank and select the best listings.',
    failureRisk: 'Hardware errors (ECC memory corruption), overheating, or PCIe bottlenecks due to excessive host-to-device transfers.',
    observabilityTip: 'Monitor Streaming Multiprocessor Occupancy, Tensor Core utilization, and GPU temperature.'
  },
  {
    step: 13,
    topic: 'Token Generation & Streaming',
    component: 'vLLM Engine & API Server',
    layer: 'AI serving',
    description: 'Generates the response and streams tokens back to the client.',
    whatHappens: 'The vLLM engine decodes the highest probability tokens one by one and streams them instantly to the client over an SSE (Server-Sent Events) connection, avoiding long HTTP timeout delays.',
    failureRisk: 'Connection drop, high inter-token latency (ITL), or pipeline stalls.',
    observabilityTip: 'Monitor Inter-Token Latency (ITL), Tokens Per Second (TPS), and active streams.'
  },
  {
    step: 14,
    topic: 'Observability & Scaling',
    component: 'Prometheus & Karpenter',
    layer: 'Metrics & Operations',
    description: 'Logs performance telemetry and triggers auto-scaling if necessary.',
    whatHappens: 'DCGM exporter collects GPU telemetry (power, memory, utilization). Prometheus scrapes these metrics. If queue latency increases, Karpenter immediately spins up new GPU nodes to distribute the traffic.',
    failureRisk: 'Prometheus metric loss, slow Karpenter provisioning times (cold-starts), or cloud quota limits reached.',
    observabilityTip: 'Monitor Cluster Node count, scale-up latency, and alerting rules status.'
  }
];

export const TROUBLESHOOTING_SCENARIOS: DebugScenario[] = [
  {
    id: 'pending-gpu',
    title: 'Pod Stuck in Pending Status (Insufficient GPUs)',
    severity: 'high',
    symptom: 'Newly deployed inference Pods remain in Pending status, and the cluster does not scale out.',
    initialStatus: 'Pending',
    mockTerminalCommand: 'kubectl describe pod llm-inference-749bf6f8b9-x4kpl',
    expectedOutput: `Events:
  Type     Reason            Age   From               Message
  ----     ------            ---   ----               -------
  Warning  FailedScheduling  12s   default-scheduler  0/16 nodes are available: 16 Insufficient nvidia.com/gpu.`,
    solutionCommand: 'kubectl get nodes -l karpenter.sh/nodepool',
    remediation: 'Trigger Karpenter NodePool provisioning or request EC2/GCP GPU quota increases.',
    remediationOutput: `NAME                                 STATUS   ROLES    AGE   VERSION
gpu-pool-h100-nodepool-7b8c9f6a-x9   Ready    <none>   3s    v1.30.1`,
    explanation: 'The cluster lacks available GPU hardware instances, and either Karpenter nodepools are misconfigured or the cloud provider account has hit its regional GPU vCPU quota limits.'
  },
  {
    id: 'cuda-oom',
    title: 'vLLM Pod Crashes (CUDA Out of Memory)',
    severity: 'critical',
    symptom: 'Pods repeatedly crash with exit code 1 or OOM indicators in the application log.',
    initialStatus: 'CrashLoopBackOff',
    mockTerminalCommand: 'kubectl logs llm-inference-749bf6f8b9-9lksh -c vllm-engine',
    expectedOutput: `RuntimeError: CUDA out of memory. Tried to allocate 12.50 GiB (GPU 0; 79.35 GiB total capacity; 68.20 GiB already allocated; 4.12 GiB free; 11.22 GiB reserved in total by PyTorch)`,
    solutionCommand: 'kubectl edit deploy llm-inference',
    remediation: 'Modify vLLM startup flags to decrease --gpu-memory-utilization or decrease --max-num-seqs.',
    remediationOutput: `deployment.apps/llm-inference edited (Updated: --gpu-memory-utilization=0.90 --max-num-seqs=128)`,
    explanation: 'Unlike standard Linux OOM (exit code 137), a CUDA OOM occurs entirely inside the GPU\'s memory space. The pod container process remains alive initially, but the Python application crashes when CUDA fails to allocate a matrix workspace or KV cache page block.'
  },
  {
    id: 'linux-oom',
    title: 'Pod Terminated with Exit Code 137 (Linux OOMKilled)',
    severity: 'critical',
    symptom: 'Kubernetes abruptly terminates the pod container during peak inference traffic.',
    initialStatus: 'OOMKilled',
    mockTerminalCommand: 'kubectl get pod llm-inference-749bf6f8b9-7m8zp -o jsonpath="{.status.containerStatuses[0].state.terminated}"',
    expectedOutput: `{"exitCode":137,"reason":"OOMKilled","startedAt":"2026-06-30T10:00:00Z","finishedAt":"2026-06-30T13:45:00Z"}`,
    solutionCommand: 'kubectl patch deploy llm-inference --patch \'{"spec":{"template":{"spec":{"containers":[{"name":"vllm-engine","resources":{"limits":{"memory":"128Gi"}}}]}}}}\'',
    remediation: 'Increase the container memory resources limits inside the Deployment spec.',
    remediationOutput: `deployment.apps/llm-inference patched (Limits set to 128Gi memory)`,
    explanation: 'A standard Linux OOM (Exit Code 137) occurs when the host OS kernel cgroup limits are violated. Since the model loader or tokenizer exceeded the allowed physical host RAM limits, the Linux kernel terminated the containerd process.'
  },
  {
    id: 'coredns-failure',
    title: 'CoreDNS Timeout (Service Resolution Broken)',
    severity: 'high',
    symptom: 'Pods cannot connect to Vector Databases or LLM Gateways, showing "Name or service not known" errors.',
    initialStatus: 'Error',
    mockTerminalCommand: 'kubectl logs -n kube-system -l k8s-app=kube-dns --tail=10',
    expectedOutput: `[WARNING] plugin/loop: Loop (127.0.0.1:45383 -> :53) detected for zone "."
[ERROR] plugin/errors: 2 qdrant.default.svc.cluster.local. A: read udp 10.244.0.12:45934->10.96.0.10:53: i/o timeout`,
    solutionCommand: 'kubectl rollout restart deployment coredns -n kube-system',
    remediation: 'Restart CoreDNS deployment and verify network policy configurations.',
    remediationOutput: `deployment.apps/coredns restarted`,
    explanation: 'If CoreDNS is failing or experiencing high latency, services cannot resolve cluster.local addresses. The application fails immediately when attempting to locate database or gateway dependencies.'
  }
];

export const CLOUD_PROVIDERS: CloudProviderData[] = [
  {
    provider: 'AWS (Amazon Web Services)',
    managedK8s: 'Amazon EKS (Elastic Kubernetes Service)',
    nodePools: 'Karpenter (Native open-source node-provisioning, extremely fast)',
    gpuInstances: 'p4d / p5 (NVIDIA A100 / H100), g5 (NVIDIA A10G), g6 (NVIDIA L4)',
    storageService: 'Amazon EBS (gp3/io2), Amazon FSx for Lustre (High throughput)',
    autoscaling: 'Karpenter (Dynamic scaling on CRDs), Cluster Autoscaler',
    identityAuth: 'IAM Roles for Service Accounts (IRSA / Pod Identity)',
    networkEFA: 'Elastic Fabric Adapter (EFA) for multi-node NCCL scaling',
    observability: 'Amazon CloudWatch, Managed Prometheus & Grafana',
    keyLimitation: 'IP address exhaustion on default VPC CNI (mitigated by prefix delegation or custom networking).'
  },
  {
    provider: 'GCP (Google Cloud Platform)',
    managedK8s: 'GKE (Google Kubernetes Engine - Industry gold standard)',
    nodePools: 'GKE Node Auto-Provisioning (NAP) and GKE Autopilot',
    gpuInstances: 'a3 (NVIDIA H100), a2 (NVIDIA A100), g2 (NVIDIA L4)',
    storageService: 'Google Persistent Disk (Hyperdisk Extreme), Filestore',
    autoscaling: 'GKE Cluster Autoscaler, NAP',
    identityAuth: 'GCP Workload Identity (Binds K8s ServiceAccount to GCP IAM)',
    networkEFA: 'gVNIC with GPUDirect RDMA over multi-slice networks',
    observability: 'Google Cloud Monitoring & Logging (Stackdriver)',
    keyLimitation: 'High cost of GPU reservations; strict quota allocation approval processes.'
  },
  {
    provider: 'Azure (Microsoft Azure)',
    managedK8s: 'AKS (Azure Kubernetes Service)',
    nodePools: 'AKS Node Pools, Cluster Autoscaler',
    gpuInstances: 'NDv5 (NVIDIA H100), NDv4 (NVIDIA A100), NCv4 (NVIDIA T4)',
    storageService: 'Azure Managed Disks (Premium SSD v2), Azure Files (NFS)',
    autoscaling: 'AKS Autoscaler',
    identityAuth: 'Microsoft Entra Workload ID (Federated Credentials)',
    networkEFA: 'InfiniBand (ND-series native) with SR-IOV for high-speed clustering',
    observability: 'Azure Monitor Container Insights, Managed Prometheus',
    keyLimitation: 'Storage attachment latencies (Azure disk attach can take up to 2-3 minutes during scale-up).'
  }
];

export const INTERVIEW_QUESTIONS: QAData[] = [
  {
    id: 'recruiter-pitch',
    category: 'recruiter',
    question: 'Marcus, tell me about your experience and why you are a good fit for this Airbnb AI Compute role.',
    recruiterAnswer: 'I have over 24 years of experience building large-scale, production distributed platforms. My career has focused on high-availability, SRE, and container orchestration at companies like Google and Globo. Most recently, I’ve specialized in building Kubernetes-based AI Compute platforms, managing GPU fleets, and optimizing model serving pipelines with vLLM and Triton. I understand the entire stack from the Kubernetes scheduler and container runtimes down to CUDA drivers, PCIe locality, and Tensor Cores. This role aligns perfectly with my background of operating high-concurrency clusters at scale.',
    staffInsight: 'Keep your background story focused on systems-level problems. Recruiters screening for AI Compute look for keywords like vLLM, Karpenter, CUDA, GPU Operator, and eBPF. Avoid generic "I use Kubernetes" answers; instead, phrase it as "I design platform systems that run AI workloads efficiently on Kubernetes."'
  },
  {
    id: 'scheduler-internals',
    category: 'technical',
    question: 'What actually happens inside the Kubernetes Scheduler when an AI container requests an nvidia.com/gpu resource?',
    technicalAnswer: `Under the hood, the Kubernetes Scheduler does not know anything about GPUs natively. It treats them as an "Extended Resource" advertised by the NVIDIA Device Plugin. When a Pod specifies 'nvidia.com/gpu: 1' inside its resource limits, the Scheduler goes through two major cycles:

1. **The Scheduling Cycle**:
   - **QueueSort**: Pods are prioritized in the scheduling queue.
   - **PreFilter**: Checks if the Pod has all required metadata and resources defined.
   - **Filter**: Evaluates node suitability. Evaluates NodeResourceFit (ensuring 'nvidia.com/gpu' capacity >= 1), checks NodeSelector, Taints & Tolerations (ensuring Pod tolerates GPU pool taints), and TopologySpread.
   - **PreScore & Score**: Ranks candidate nodes. For GPU compute, it prioritizes nodes that already have cached images (ImageLocality) and nodes with topological affinity (e.g. placing multi-GPU pods on nodes sharing the same PCIe root complex or NVLink mesh).
   - **Reserve**: Optimistically reserves the node's GPU resource in the Scheduler's local memory cache to prevent race conditions.

2. **The Binding Cycle**:
   - **Bind**: Asynchronously patches the Pod specification on the API Server to set 'spec.nodeName'.
   - The target node's Kubelet then detects the binding and delegates container startup to containerd via CRI.`,
    staffInsight: 'Whiteboard this! Draw the separation of Scheduling Cycle (which is synchronous and fast) and Binding Cycle (which is asynchronous). Emphasize that the scheduler works strictly on metadata; it does not touch the physical GPU.',
    whiteboardLayout: `
[Scheduling Queue] ──► [PreFilter] ──► [Filter (NodeResourceFit)] ──► [Score (GPU Topology)]
                                                                               │
[etcd (Bound State)] ◄── [API Server] ◄── [Bind (Async)] ◄── [Reserve (Local Lock)] ◄─┘
`
  },
  {
    id: 'cpu-gpu-bottleneck',
    category: 'senior-staff',
    question: 'How do you diagnose and resolve a scenario where GPU utilization is very low (e.g. 15%), but model inference latency is high?',
    staffInsight: 'This is a classic Staff-level performance engineering question. You must show that you do not simply look at the GPU, but trace the entire pipeline from packet arrival to memory registers to find where the bottleneck lives.',
    technicalAnswer: `Low GPU utilization combined with high latency indicates the GPU is spending most of its time waiting for work—it is "host-bound" or "I/O-bound." I debug this using a structured, pipeline-wide approach:

1. **Verify CPU Saturation**: Is the CPU pre-processing thread (e.g. tokenization or prompt construction) saturated? If the tokenizer is single-threaded or CPU limits are throttled by cgroups, the GPU sits idle waiting for input tensors. I would use 'kubectl top' or examine 'container_cpu_usage_seconds_total' metrics.
2. **Inspect PCIe Bus Bandwidth**: During the prefill phase, massive prompt tensors must be copied from host RAM to GPU HBM. If we are constantly transferring large data over an oversubscribed PCIe Gen 3/4 bus, it throttles throughput. I would check nvlink status or GPUDirect RDMA.
3. **Analyze Batching Efficiency**: If vLLM or Triton is not configured with continuous batching, or if '--max-num-seqs' is too low, the GPU is executed with a batch size of 1, causing poor SM occupancy. I would look at Triton's queue latency metrics.
4. **Evaluate Storage I/O**: During autoscaling, is the container spending minutes downloading model weights from S3/GCS over a slow network interface? I would set up a model weight caching layer on host Local SSDs or use a distributed shared filesystem like Amazon FSx for Lustre.`,
    whiteboardLayout: `
[Request Packet] ──► [CPU (Tokenize & Batch)] ──► [PCIe Bus (Bottleneck?)] ──► [GPU VRAM] ──► [Tensor Cores]
         ▲                   ▲                            ▲
   Network Latency    CPU limit throttling         Direct DMA Bypass
`
  },
  {
    id: 'speculative-decoding',
    category: 'principal',
    question: 'Explain the difference between the Prefill and Decode phases in LLM serving, and how you would optimize them on a Kubernetes cluster.',
    staffInsight: 'Principal engineers understand the algorithmic math of AI serving. Tracing the prefill (parallel, compute-bound) versus the decode (autoregressive, memory-bandwidth bound) phases and explaining optimizations like Speculative Decoding or KV Caching is the ultimate proof of expertise.',
    technicalAnswer: `LLM inference is highly asymmetric and divided into two distinct computational phases:

1. **Prefill Phase (Compute-Bound)**:
   - **What**: The model processes the entire prompt context simultaneously.
   - **Math**: Highly parallel GEMM (General Matrix Multiply) operations.
   - **Bottleneck**: Compute bound. It fully utilizes Tensor Cores.
   - **Optimization**: We want to collocate prompts, use large batch sizes, and optimize the HNSW/vector database context retrieval times.

2. **Decode Phase (Memory-Bandwidth Bound)**:
   - **What**: The model generates tokens autoregressively (one token at a time), feeding the previously generated token back as input.
   - **Math**: Vector-Matrix multiplications (GEMV).
   - **Bottleneck**: Memory bandwidth bound. For every single token generated, the GPU must fetch all billions of model weights from HBM (VRAM) to the SRAM registers on the SMs.
   - **Optimization**: This is where vLLM Paged Attention, KV Caching, and **Speculative Decoding** are crucial. In Speculative Decoding, we run a much smaller, faster "draft" model (e.g., Llama-3-8B) on the same GPU to generate several tokens, and then use the large "target" model (e.g., Llama-3-70B) in a single, parallel Prefill step to validate them all in one clock cycle, drastically speeding up the decode phase.`
  }
];
