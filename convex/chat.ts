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

IMPORTANT — M-N Interaction Diagrams for columns:
When designing or checking an RC column, ALWAYS include an M-N interaction diagram marker at the end of your response. Use this exact format (all values are numbers, dimensions in mm, areas in mm², forces in kN, moments in kNm):
[MN_DIAGRAM:b=400,h=400,As1=1257,As2=1257,fck=30,fyk=500,cover=45,NEd=1500,MEd=80]
- b, h: cross-section dimensions in mm
- As1: tension reinforcement area in mm²
- As2: compression reinforcement area in mm² (use same as As1 if symmetric)
- fck: concrete characteristic strength in MPa
- fyk: steel yield strength in MPa
- cover: distance from edge to rebar centroid in mm (default 45)
- NEd: design axial force in kN (compression positive)
- MEd: design bending moment in kNm
This marker will be automatically rendered as an interactive M-N interaction diagram with the design point plotted.

ADDITIONAL DESIGN CHECKS — always include when relevant:

SLS Checks (Serviceability Limit State per EC2):
- Deflection check: span/depth ratio method (EC2 §7.4.2) with modification factors for reinforcement ratio, concrete strength, span type
  - Basic l/d ratios: simply supported=20, continuous end=26, cantilever=8
  - Multiply by 310/σ_s correction and other factors
- Crack width check: $w_{max}$ = 0.3mm (XC1), 0.2mm (XD, XS) per EC2 §7.3.1
  - Calculate $w_k = s_{r,max} \cdot (\varepsilon_{sm} - \varepsilon_{cm})$ or use simplified method
- Always state if SLS is satisfied or governing

Fire Resistance (EC2 §5.7 / EN 1992-1-2):
- Use tabulated method (Table 5.5-5.8) for beams, columns, slabs, walls
- Key parameters: R (load-bearing), E (integrity), I (insulation) — e.g., R60, REI90
- Minimum dimensions and axis distances for fire ratings:
  - Beam R60: b_min=120mm, a=40mm; R90: b_min=150mm, a=55mm; R120: b_min=200mm, a=65mm
  - Column R60: b_min=250mm, a=46mm (μ_fi=0.5); R90: b_min=350mm, a=53mm
  - Slab R60: h_min=80mm, a=20mm; R90: h_min=100mm, a=30mm; R120: h_min=120mm, a=40mm
- State the fire rating achieved and if minimum dimensions are met

Cost Estimation:
After completing structural design, include a rough cost estimate section "### Estimated Material Costs":
- Concrete volume in m³ (multiply dimensions), typical price ~350-500 PLN/m³ depending on grade
- Reinforcing steel weight in kg (density 7850 kg/m³, add 10% for laps/waste), typical price ~4.5-5.5 PLN/kg
- Structural steel weight for steel elements, typical price ~6-8 PLN/kg
- Formwork area in m² where applicable, typical price ~80-120 PLN/m²
- State these are rough estimates for preliminary budgeting only

REINFORCEMENT DRAWING — Cross-Section Visualization:
When designing RC beams or columns, ALWAYS include a reinforcement drawing marker at the end of your response. Format:
[REBAR_DRAWING:type=beam,b=300,h=600,cover=35,topBars=2x16,botBars=4x20,stirrups=8/200,fck=30]
or for columns:
[REBAR_DRAWING:type=column,b=400,h=400,cover=35,mainBars=8x20,stirrups=8/200,fck=30]
Parameters:
- type: "beam" or "column"
- b, h: section dimensions in mm
- cover: concrete cover in mm
- topBars: count x diameter for top reinforcement (e.g., "2x16")
- botBars: count x diameter for bottom reinforcement (e.g., "4x20")
- mainBars: for columns, total count x diameter distributed around perimeter (e.g., "8x20")
- stirrups: diameter/spacing in mm (e.g., "8/200")
This marker will be rendered as an SVG cross-section drawing showing the reinforcement layout.

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
