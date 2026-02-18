import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getOrCreate = mutation({
  args: { sessionId: v.string() },
  returns: v.id("conversations"),
  handler: async (ctx, { sessionId }) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("conversations", { sessionId });
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      isStreaming: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, { conversationId }) => {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    return msgs.map((m) => ({
      _id: m._id,
      _creationTime: m._creationTime,
      role: m.role,
      content: m.content,
      isStreaming: m.isStreaming,
    }));
  },
});

export const listConversations = query({
  args: { sessionId: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("conversations"),
      _creationTime: v.number(),
      sessionId: v.string(),
      title: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { sessionId }) => {
    const convos = await ctx.db
      .query("conversations")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .collect();
    return convos.map((c) => ({
      _id: c._id,
      _creationTime: c._creationTime,
      sessionId: c.sessionId,
      title: c.title,
    }));
  },
});
