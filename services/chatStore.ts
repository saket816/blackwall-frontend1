import { API_BASE_URL } from '../constants';
import { Message } from '../types';

export interface ChatSession {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages?: Message[];
}

/**
 * Get all chat sessions (without messages).
 */
export const getAllSessions = async (): Promise<ChatSession[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chats`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.sessions;
    } catch (error) {
        console.error("Failed to fetch sessions:", error);
        return [];
    }
};

/**
 * Create a new chat session.
 */
export const createSession = async (title: string = "New Chat"): Promise<ChatSession | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ title }),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to create session:", error);
        return null;
    }
};

/**
 * Get a chat session with all its messages.
 */
export const getSessionWithMessages = async (sessionId: string): Promise<ChatSession | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chats/${sessionId}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // Transform messages to match frontend Message type
        if (data.messages) {
            data.messages = data.messages.map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                structuredData: msg.structured_data,
                timestamp: new Date(msg.created_at).getTime()
            }));
        }

        return data;
    } catch (error) {
        console.error("Failed to fetch session:", error);
        return null;
    }
};

/**
 * Add a message to a chat session.
 */
export const addMessageToSession = async (
    sessionId: string,
    role: string,
    content: string,
    structuredData?: Record<string, any>
): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chats/${sessionId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                role,
                content,
                structured_data: structuredData
            }),
        });

        return response.ok;
    } catch (error) {
        console.error("Failed to add message:", error);
        return false;
    }
};

/**
 * Delete a chat session.
 */
export const deleteSession = async (sessionId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chats/${sessionId}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' },
        });

        return response.ok;
    } catch (error) {
        console.error("Failed to delete session:", error);
        return false;
    }
};
