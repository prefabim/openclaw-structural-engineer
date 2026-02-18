import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  conversations: defineTable({
    sessionId: v.string(),
    title: v.optional(v.string()),
  }).index("by_sessionId", ["sessionId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    isStreaming: v.optional(v.boolean()),
  }).index("by_conversation", ["conversationId"]),
});

export default schema;
