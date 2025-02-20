import React, { useState, useRef, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../components/ui/card";

interface ChatMessage {
  sender: "user" | "agent";
  text: string;
}

const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const trimmedMessage = input.trim();
    if (!trimmedMessage) return;

    // Append the user's message to the conversation
    setMessages((prev) => [...prev, { sender: "user", text: trimmedMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      // Use the env variable for the base URL
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const url = threadId ? `${baseUrl}/chat/${threadId}` : `${baseUrl}/chat`;
      const payload = { message: trimmedMessage };
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      // If it's a new conversation, store the generated threadId
      if (!threadId && data.threadId) {
        setThreadId(data.threadId);
      }

      // Append the agent's response
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: data.response },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: "Sorry, there was an error." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10 shadow bg-white dark:bg-gray-800">
      <CardHeader className="bg-gray-50 dark:bg-gray-900">
        <CardTitle className="text-2xl dark:text-white">AI Chat</CardTitle>
      </CardHeader>
      <CardContent
        ref={chatContainerRef}
        className="h-96 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-4 space-y-4"
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {msg.sender === "user" ? "You" : "Agent"}
            </span>
            <p
              className={`px-4 py-2 rounded-md ${
                msg.sender === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
              }`}
            >
              {msg.text}
            </p>
          </div>
        ))}
        {isLoading && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Loading response...
          </p>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 p-4 bg-gray-50 dark:bg-gray-900">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question or message..."
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={isLoading}>
          Send
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ChatApp;
