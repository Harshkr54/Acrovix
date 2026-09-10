/**
 * ACROVIX Chatbot — Gemini AI Service
 *
 * Calls the Spring Boot backend proxy (/api/chat) which securely
 * forwards the request to Google Gemini API.
 * The Gemini API key is never exposed to the browser.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:8080' : '');

/**
 * Sends a message to the Gemini AI via backend proxy.
 * @param {string} message - The user's message
 * @param {Array} history  - Conversation history [{role, text}]
 * @returns {Promise<string>} - AI reply text
 */
export async function sendToGemini(message, history = []) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return data.reply || "I'm sorry, I couldn't process that. Please try again.";
  } catch (error) {
    console.error('[Gemini Service] Error:', error);
    return "I'm experiencing a temporary issue. Please contact us at sales@acrovix.com or call +91-8660947415.";
  }
}
