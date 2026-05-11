export type AgentPurpose =
    | "BUSINESS"
    | "RESEARCH"
    | "CUSTOMER_SUPPORT"
    | "DATA_ANALYSIS"
    | "CONTENT_CREATION"
    | "CODING"
    | "GENERAL";

export type AgentStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

export interface AgentConfig {
    [key: string]: any;
    model?: string;
    maxToken?: number;
    temperature?: number;
}

export interface CreateAgentRequest {
    name: string;
    description?: string;
    prompt: string;
    purpose: AgentPurpose;
    config?: AgentConfig;
    toolIds?: string[];
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {}

export interface AgentResponse {
    id: string;
    name: string;
    description: string | null;
    prompt: string;
    purpose: AgentPurpose;
    status: AgentStatus;
    config: AgentConfig;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}
