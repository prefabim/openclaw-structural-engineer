import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, HardHat, Bot, User, Plus, MessageSquare, ArrowLeft, FileDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile";
import { generateCalcNotePdf } from "@/lib/generatePdf";
import { toast } from "sonner";

function getSessionId(): string {
  const KEY = "se-session-id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

function MessageBubble({
  role,
  content,
  isStreaming,
  userQuery,
}: { role: "user" | "assistant"; content: string; isStreaming?: boolean; userQuery?: string }) {
  if (role === "user") {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-3">
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const handleExportPdf = async () => {
    try {
      const title = userQuery
        ? userQuery.length > 60
          ? `${userQuery.substring(0, 57)}...`
          : userQuery
        : "Calculation Note";
      toast.info("Generating PDF...");
      await generateCalcNotePdf({
        title,
        content,
      });
      toast.success("PDF downloaded");
    } catch (e) {
      console.error("PDF generation error:", e);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-chart-1/15 flex items-center justify-center">
        <HardHat className="w-4 h-4 text-chart-1" />
      </div>
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-bl-sm bg-muted/50 border px-4 py-3">
          {isStreaming && !content ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Calculating...</span>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-pre:bg-background prose-pre:border">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>
        {content && !isStreaming && (
          <div className="mt-1.5 ml-1">
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  "Design an RC beam: span 6m, b=30cm, h=60cm, g=15 kN/m, q=10 kN/m, C30/37",
  "Select a steel IPE profile for an 8m span, load 25 kN/m, S355",
  "Check a 40×40cm column: H=3.5m, N=1500kN, M=80kNm, C30/37",
  "Design a two-way slab 5×7m, h=20cm, g=7.5 kN/m², q=3.0 kN/m²",
];

export function ChatPage() {
  const sessionId = getSessionId();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getOrCreate = useMutation(api.conversations.getOrCreate);
  const sendMessage = useAction(api.chat.sendMessage);
  const conversations = useQuery(api.conversations.listConversations, { sessionId });
  const messages = useQuery(
    api.conversations.getMessages,
    conversationId ? { conversationId } : "skip",
  );

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pick up IFC prompt if redirected from IFC page
  useEffect(() => {
    const ifcPrompt = sessionStorage.getItem("ifc-prompt");
    if (ifcPrompt) {
      sessionStorage.removeItem("ifc-prompt");
      // Small delay to let component mount
      const timer = setTimeout(() => {
        handleSend(ifcPrompt);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewConversation = useCallback(async () => {
    const id = await getOrCreate({ sessionId });
    setConversationId(id);
    if (isMobile) setShowSidebar(false);
  }, [getOrCreate, sessionId, isMobile]);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      let convId = conversationId;
      if (!convId) {
        convId = await getOrCreate({ sessionId });
        setConversationId(convId);
      }
      setInput("");
      await sendMessage({ conversationId: convId, content });
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }, [input, isSending, conversationId, getOrCreate, sessionId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages && messages.length > 0;

  // Build a map of assistant message -> preceding user query for PDF title
  const userQueryMap = new Map<string, string>();
  if (messages) {
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === "assistant" && i > 0 && messages[i - 1].role === "user") {
        userQueryMap.set(messages[i]._id, messages[i - 1].content);
      }
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {showSidebar && (
        <div className={`${isMobile ? "absolute inset-0 z-50 bg-background" : "w-72 border-r"} flex flex-col`}>
          <div className="p-4 border-b flex items-center gap-2">
            <HardHat className="w-5 h-5 text-chart-1" />
            <span className="font-semibold text-sm">{APP_NAME}</span>
          </div>
          <div className="p-3">
            <Button
              onClick={handleNewConversation}
              className="w-full justify-start gap-2"
              variant="outline"
              size="sm"
            >
              <Plus className="w-4 h-4" /> New conversation
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-3">
            {conversations?.slice().reverse().map((conv) => (
              <button
                type="button"
                key={conv._id}
                onClick={() => {
                  setConversationId(conv._id);
                  if (isMobile) setShowSidebar(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate mb-1 transition-colors ${
                  conversationId === conv._id
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 inline-block mr-2 -mt-0.5" />
                {conv.title || "New conversation"}
              </button>
            ))}
          </div>
          <div className="p-3 border-t">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to home
            </button>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="h-14 border-b flex items-center gap-3 px-4">
          {(!showSidebar || isMobile) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSidebar(true)}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}
          {showSidebar && isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSidebar(false)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-chart-1" />
            <span className="font-medium text-sm">Structural Engineer</span>
          </div>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground hidden sm:block">Eurocode-based design assistant</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full px-4 py-12">
              <div className="w-16 h-16 rounded-2xl bg-chart-1/10 flex items-center justify-center mb-6">
                <HardHat className="w-8 h-8 text-chart-1" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Digital Structural Engineer</h2>
              <p className="text-muted-foreground text-sm text-center max-w-md mb-8">
                Design reinforced concrete and steel elements per Eurocodes.
                Ask about beams, columns, slabs, or steel profiles.
              </p>
              <div className="grid gap-2 w-full max-w-lg">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={isSending}
                    className="text-left px-4 py-3 border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg._id}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.isStreaming ?? undefined}
                  userQuery={userQueryMap.get(msg._id)}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t bg-background/80 backdrop-blur-sm p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the structural element to design..."
              className="min-h-[44px] max-h-[160px] resize-none rounded-xl"
              rows={1}
              disabled={isSending}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isSending}
              size="icon"
              className="h-[44px] w-[44px] rounded-xl shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            AI-powered calculations are for preliminary design only. Always verify with a licensed engineer.
          </p>
        </div>
      </div>
    </div>
  );
}
