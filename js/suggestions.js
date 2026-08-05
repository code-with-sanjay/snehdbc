// js/suggestions.js
import { sessions } from './storage.js';

function extractJSONPrompts(text) {
    try {
        let clean = text.replace(/```json\s*|\s*```/g, '');
        const match = clean.match(/\[[\s\S]*?\]/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed) && parsed.length) return parsed.slice(0, 3);
        }
    } catch (e) {
        console.warn("Failed to parse AI suggestions:", e);
    }
    return null;
}

let welcomePromise = null;

export async function getWelcomePrompts() {
    if (welcomePromise) return welcomePromise;

    welcomePromise = (async () => {
        const defaultPrompts = [
            { icon: "lightbulb", text: "Summarize the mechanism of action of Beta-blockers" },
            { icon: "calendar", text: "Create my perfect productive morning routine" },
            { icon: "heart", text: "Tell me a short motivational story about overcoming failure" }
        ];

        const now = Date.now();
        const cachedTime = localStorage.getItem('sneh_welcome_time');
        const cachedPrompts = localStorage.getItem('sneh_welcome_prompts');
        const SIX_HOURS_MS = 21600000;

        if (cachedTime && cachedPrompts && (now - parseInt(cachedTime)) < SIX_HOURS_MS) {
            return JSON.parse(cachedPrompts);
        }

        let userHistory = [];
        const sortedIds = Object.keys(sessions).sort((a, b) => b.split('_')[1] - a.split('_')[1]);
        
        for (let id of sortedIds) {
            const chat = sessions[id];
            for (let i = chat.length - 1; i >= 0; i--) {
                if (chat[i].role === 'user') {
                    userHistory.push(chat[i].content.slice(0, 200));
                }
                if (userHistory.length >= 10) break;
            }
            if (userHistory.length >= 10) break;
        }

        if (userHistory.length === 0) return defaultPrompts;

        try {
            const systemPrompt = `Analyze the user's past 10 queries:\n${userHistory.join('\n')}\nGenerate 3 personalized, highly relevant questions or tasks the user is likely to ask next. Keep them between 6 to 11 words. Return ONLY a valid JSON array of 3 strings. Example: ["How can I optimize my previous JavaScript code?"]`;

            const response = await fetch("/.netlify/functions/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "system", content: systemPrompt }],
                    temperature: 0.7,
                    max_tokens: 150
                })
            });

            if (!response.ok) throw new Error("API Error");
            const data = await response.json();
            const generatedTexts = extractJSONPrompts(data.choices[0].message.content);

            if (generatedTexts && generatedTexts.length > 0) {
                const icons = ["zap", "compass", "book-open", "activity", "cpu", "star"];
                const formattedPrompts = generatedTexts.map((text) => ({
                    icon: icons[Math.floor(Math.random() * icons.length)],
                    text: text.replace(/["']/g, '') 
                }));
                
                localStorage.setItem('sneh_welcome_prompts', JSON.stringify(formattedPrompts));
                localStorage.setItem('sneh_welcome_time', now.toString());
                return formattedPrompts;
            }
        } catch (error) {
            console.warn("Background prompt generation failed, using defaults.");
        }
        return defaultPrompts;
    })();

    const result = await welcomePromise;
    welcomePromise = null;
    return result;
}

export async function getFollowUpQuestions(currentMessages, signal) {
    if (!currentMessages || currentMessages.length < 2) return null;
    const recentContext = currentMessages.slice(-4);
    
    const fetchPrompts = async () => {
        try {
            const response = await fetch("/.netlify/functions/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: signal,
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: `Based on this conversation, suggest 3 highly relevant, short follow-up questions (3 to 10 words) the user could ask next. Return ONLY a valid JSON array of 3 strings.` },
                        ...recentContext
                    ],
                    temperature: 0.7,
                    max_tokens: 100
                })
            });

            if (!response.ok) return null;
            const data = await response.json();
            return extractJSONPrompts(data.choices[0].message.content);

        } catch (error) {
            if (error.name === 'AbortError') console.log('Follow-up generation aborted.');
            return null;
        }
    };

    return fetchPrompts();
}
