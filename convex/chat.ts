import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const VIKTOR_API_URL = process.env.VIKTOR_SPACES_API_URL!;
const PROJECT_NAME = process.env.VIKTOR_SPACES_PROJECT_NAME!;
const PROJECT_SECRET = process.env.VIKTOR_SPACES_PROJECT_SECRET!;

const SYSTEM_PROMPT = `You are a Digital Structural Engineer — an expert AI assistant specializing in structural engineering design per Eurocodes (European standards).

Your core competencies:
- Reinforced concrete design per Eurocode 2 (EC2): beams, slabs, columns
- Steel design per Eurocode 3 (EC3): beam profile selection (IPE, HEA, HEB)
- Load combinations per Eurocode 0 (EC0)
- BIM/IFC model analysis
- Polish National Annex defaults (B500SP steel, standard concrete grades)

Design approach:
1. Always ask for missing parameters before calculating
2. Use characteristic → design values (γ_G=1.35, γ_Q=1.50)
3. Show step-by-step calculations with formulas
4. Provide practical recommendations (bar diameters, spacing, profile selection)
5. Include utilization ratios and safety checks
6. Format results in clear tables when appropriate

Material defaults (Polish National Annex):
- Reinforcing steel: B500SP (f_yk = 500 MPa)
- Common concrete grades: C20/25, C25/30, C30/37, C35/45
- Structural steel: S235, S275, S355
- Concrete cover: 25-35mm typical
- γ_c = 1.4, γ_s = 1.15 (persistent/transient)

When performing calculations:
- Present formulas clearly using standard notation
- Show intermediate steps
- Highlight the final result with recommendations
- Warn about any assumptions or limitations
- Suggest practical reinforcement layouts (bar count × diameter)

You respond in English. Be precise, professional, and thorough. Use markdown formatting with tables and **bold** for key results.

CRITICAL: Use LaTeX math notation for ALL mathematical symbols, formulas, and expressions:
- Inline math: $A_s$, $f_{ck}$, $\gamma_c$, $M_{Ed}$, $V_{Rd,c}$
- Display math for key equations:
$$M_{Ed} = \frac{q \cdot l^2}{8}$$
- Always use subscripts ($A_s$ not As), Greek letters ($\gamma$ not gamma), fractions ($\frac{a}{b}$ not a/b)
- Units after math: $A_s = 699.4 \text{ mm}^2$
- Symbols: $\leq$, $\geq$, $\phi$ (diameter), $\times$ (multiplication)`;

async function callAI(
  messages: { role: string; content: string }[],
): Promise<string> {
  // Build conversation context
  const conversationText = messages
    .map((m) => `${m.role === "system" ? "SYSTEM" : m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
    .join("\n\n");

  const response = await fetch(`${VIKTOR_API_URL}/api/viktor-spaces/tools/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_name: PROJECT_NAME,
      project_secret: PROJECT_SECRET,
      role: "ai_structured_output",
      arguments: {
        prompt: `You are a structural engineering AI assistant. Given the conversation below, provide a detailed expert response to the user's latest message. Use Eurocode standards (EC0, EC2, EC3). Include calculations with step-by-step formulas, tables, and practical recommendations where applicable. Format your response in markdown. Be thorough and precise. IMPORTANT: Use LaTeX math notation for ALL symbols and formulas — inline $...$ and display $$...$$ blocks. Examples: $A_s$, $f_{ck}$, $\\gamma_c = 1.4$, $$M_{Ed} = \\frac{q \\cdot l^2}{8}$$`,
        input_text: conversationText,
        output_schema: {
          type: "object",
          properties: {
            response: {
              type: "string",
              description: "The full detailed structural engineering response in markdown format",
            },
          },
          required: ["response"],
        },
        intelligence_level: "smart",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error ?? "AI call failed");
  }

  const result = json.result as { result: { response: string } | null; error: string | null };
  if (result.error) {
    throw new Error(result.error);
  }
  return result.result?.response ?? "I could not generate a response. Please try again.";
}

export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, content }) => {
    // Save user message
    await ctx.runMutation(internal.chat.addMessage, {
      conversationId,
      role: "user",
      content,
    });

    // Create placeholder for assistant response
    const assistantMsgId = await ctx.runMutation(internal.chat.addMessage, {
      conversationId,
      role: "assistant",
      content: "",
      isStreaming: true,
    });

    try {
      // Get conversation history
      const history = await ctx.runQuery(internal.chat.getHistory, {
        conversationId,
      });

      // Build messages for AI (include system prompt + last N messages for context)
      const recentHistory = (history as { role: string; content: string }[])
        .filter((m) => m.content.length > 0)
        .slice(-10); // Keep last 10 messages for context window

      const aiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...recentHistory,
      ];

      // Call AI
      const response = await callAI(aiMessages);

      // Update assistant message with response
      await ctx.runMutation(internal.chat.updateMessage, {
        messageId: assistantMsgId,
        content: response,
        isStreaming: false,
      });

      // Update conversation title if first message
      const userMsgCount = (history as { role: string }[]).filter(
        (m) => m.role === "user",
      ).length;
      if (userMsgCount <= 1) {
        const title =
          content.length > 60 ? `${content.substring(0, 57)}...` : content;
        await ctx.runMutation(internal.chat.updateTitle, {
          conversationId,
          title,
        });
      }
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Unknown error occurred";
      await ctx.runMutation(internal.chat.updateMessage, {
        messageId: assistantMsgId,
        content: `⚠️ Error: ${errMsg}\n\nPlease try again or rephrase your question.`,
        isStreaming: false,
      });
    }

    return null;
  },
});

export const addMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    isStreaming: v.optional(v.boolean()),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      isStreaming: args.isStreaming,
    });
  },
});

export const updateMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    isStreaming: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { messageId, content, isStreaming }) => {
    await ctx.db.patch(messageId, { content, isStreaming });
    return null;
  },
});

export const updateTitle = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { conversationId, title }) => {
    await ctx.db.patch(conversationId, { title });
    return null;
  },
});

export const getHistory = internalQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.array(
    v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }),
  ),
  handler: async (ctx, { conversationId }) => {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    return msgs.map((m) => ({ role: m.role, content: m.content }));
  },
});
