// Enum para validação
export const PriorityEnum = {
	LOW: "low" as const,
	MEDIUM: "medium" as const,
	HIGH: "high" as const,
} as const;

export type Priority = (typeof PriorityEnum)[keyof typeof PriorityEnum];
