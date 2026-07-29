export const SRE_GLOSSARY = {
    largest_batches: {
        title: "Compute Batch Size",
        body: "Represents the actual number of tokens processed by the GPU in a single forward pass. Due to Prefix/KV Caching, a 32k user prompt might only result in a 64-token batch if the context is already cached. High batch sizes indicate heavy active computation, not necessarily long user inputs.",
        icon: "info"
    },
    kv_cache: {
        title: "KV Cache Pool Utilization",
        body: "The percentage of the pre-allocated KV cache blocks currently in use. Note: vLLM will queue or preempt requests well before this reaches 100% (often around 50-70%) if it projects that active requests need the remaining block capacity to finish generating their outputs safely.",
        icon: "warning"
    },
    gpu_util: {
        title: "GPU Utilization (SM Activity)",
        body: "The percentage of time over the past sample period during which one or more kernels were executing on the GPU Streaming Multiprocessors (SMs).",
        icon: "info"
    },
    tensor_core: {
        title: "Tensor Core Activity",
        body: "The percentage of time the GPU's Tensor Cores were actively executing mixed-precision matrix math. High values indicate highly efficient LLM inference throughput.",
        icon: "info"
    },
    vram_used: {
        title: "VRAM Allocation",
        body: "Total GPU memory currently reserved. In vLLM, this usually jumps immediately to ~90%+ because the engine pre-allocates the entire KV cache pool at startup to prevent fragmentation and mid-generation crashes.",
        icon: "info"
    },
    q_dp: {
        title: "Queue Depth (Pending)",
        body: "The number of requests currently waiting in the engine's scheduler because the active KV cache pool or max concurrency limits are saturated.",
        icon: "warning"
    },
    tps: {
        title: "Tokens Per Second",
        body: "The aggregate throughput of the engine. 'Prompt TPS' (prefill) measures how fast input tokens are processed, while 'Gen TPS' (decode) measures how fast new output tokens are generated.",
        icon: "info"
    },
    max_concurrency: {
        title: "Max / Optimal Concurrency",
        body: "Displays the maximum concurrency reached with an acceptable error rate of <= 1% (Max), alongside the concurrency level where the engine achieved its highest total throughput (Optimal/Peak TPS).",
        icon: "info"
    },
    h100_gpu: {
        title: "Physical Hardware",
        body: "NVIDIA H100 Tensor Core GPU with 96GB of VRAM.",
        icon: "info"
    },
    engine_health: {
        title: "Internal Engine Health Matrix",
        body: "Evaluates the internal state of the AI engine pods. 'Ready' checks the local /health API, 'Identity' verifies the loaded model ID, and 'Inference' sends a synthetic prompt to test forward-pass execution on the GPU.",
        icon: "info"
    },
    routing_health: {
        title: "End-to-End Routing Matrix",
        body: "Evaluates the entire network path to the model. 'F5' checks the global load balancer, 'VM' checks the external HAProxy, and 'Kube' checks the internal Ingress. Failures here indicate network traffic is failing to reach the pods.",
        icon: "info"
    },
    total_inferences: {
        title: "Total Inferences",
        body: "The total number of requests successfully processed by the model or engine during the specified time period.",
        icon: "info"
    },
    input_tokens: {
        title: "Input Tokens",
        body: "The total number of prompt and context tokens ingested by the model during the prefill phase. This includes user text, system instructions, RAG context, and parsed vision/OCR tokens.",
        icon: "info"
    },
    output_tokens: {
        title: "Output Tokens",
        body: "The total number of new tokens generated and returned by the model during the decoding phase.",
        icon: "info"
    },
    flagship_models: {
        title: "Flagship Pricing Models",
        body: "Calculates the hypothetical financial cost if the exact same usage volume were processed by external commercial frontier models (like GPT-4o or Claude 4.6 Sonnet). This provides a benchmark for evaluating internal ROI.",
        icon: "info"
    },
    batch_ok: {
        title: "Batches Processed (B-OK/s)",
        body: "The number of successful payload batches processed per second by the Triton Inference Server. For Morpheus pipelines, this represents large blocks of data (e.g., 1024 events per batch), not individual network events.",
        icon: "info"
    },
    batch_exec: {
        title: "Batches Executed (B-EX/s)",
        body: "The rate at which the Triton inference engine executes complete batches. A low number here is normal for Morpheus as thousands of events are aggregated into a single batch execution.",
        icon: "info"
    }
};