const DEFAULT_OPENAI_MODEL = "gpt-4o";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

const isOpenAIModel = (model?: string): model is string => {
    if (!model) return false;
    return /^(gpt-|o\d|chatgpt-)/.test(model);
};

const isAnthropicModel = (model?: string): model is string => {
    if (!model) return false;
    return model.startsWith("claude-");
};

export const resolveOpenAIModel = (requestedModel?: string, configuredModel?: string) => {
    if (isOpenAIModel(requestedModel)) {
        return { model: requestedModel, replacedFrom: null };
    }

    if (isOpenAIModel(configuredModel)) {
        return { model: configuredModel, replacedFrom: requestedModel ?? null };
    }

    return { model: DEFAULT_OPENAI_MODEL, replacedFrom: requestedModel ?? configuredModel ?? null };
};

export const resolveAnthropicModel = (requestedModel?: string, configuredModel?: string) => {
    if (requestedModel === "claude-sonnet-4") {
        return { model: configuredModel ?? DEFAULT_ANTHROPIC_MODEL, replacedFrom: requestedModel };
    }

    if (isAnthropicModel(requestedModel)) {
        return { model: requestedModel, replacedFrom: null };
    }

    if (isAnthropicModel(configuredModel)) {
        return { model: configuredModel, replacedFrom: requestedModel ?? null };
    }

    return { model: DEFAULT_ANTHROPIC_MODEL, replacedFrom: requestedModel ?? configuredModel ?? null };
};
