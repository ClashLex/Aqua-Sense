/**
 * Module-level store — persists conversation state across React navigation
 * (component unmount/remount) for the lifetime of the browser session.
 */
import type { SensorName } from "../contexts/SensorDataContext";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  timestamp: Date;
}

interface ConversationStore {
  messages: ChatMessage[];
  convId: number | null;
  chatSensor: SensorName;
}

const store: ConversationStore = {
  messages: [],
  convId: null,
  chatSensor: "River Station A",
};

export function getConvStore(): ConversationStore {
  return { ...store, messages: [...store.messages] };
}

export function setConvStore(update: Partial<ConversationStore>): void {
  Object.assign(store, update);
}
