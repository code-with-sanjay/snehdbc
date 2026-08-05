/**
 * js/sneh-renderer.js
 * Optimized, Asynchronous Stream Rendering Engine for Sneh AI
 */

// ============================================================================
// LEVEL 1: NETWORK & UNICODE STREAM DECODER
// ============================================================================
/**
 * Safe stream reader wrapper. Decodes byte-buffers safely, preserves split UTF-8
 * characters across stream boundaries, and yields clean text tokens.
 * @param {ReadableStream} responseStream - The raw stream from window.fetch
 * @yields {string} Decoded text token
 */
export async function* makeSnehSafeDecoder(responseStream) {
    const reader = responseStream.getReader();
    // { stream: true } maintains internal decoder state across multi-byte characters (like emojis)
    const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });
    let buffer = "";

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const textChunk = decoder.decode(value, { stream: true });
            buffer += textChunk;

            // Handle Server-Sent Events (SSE) line fragments
            let boundary = buffer.indexOf("\n");
            while (boundary !== -1) {
                const line = buffer.substring(0, boundary).trim();
                buffer = buffer.substring(boundary + 1);

                if (line.startsWith("data: ")) {
                    const dataStr = line.substring(6).trim();
                    if (dataStr === "[DONE]") {
                        return;
                    }
                    try {
                        const parsed = JSON.parse(dataStr);
                        // Standard token fallback matching Groq/OpenAI patterns
                        const token = parsed.choices?.[0]?.delta?.content || "";
                        if (token) {
                            yield token;
                        }
                    } catch (e) {
                        // Skip incomplete or empty heartbeat data frames
                    }
                }
                boundary = buffer.indexOf("\n");
            }
        }
    } finally {
        reader.releaseLock();
    }
}

// ============================================================================
// LEVEL 7: AUTO-SCROLL ANCHOR CONTROLLER
// ============================================================================
/**
 * Monitors and maintains user viewport scroll tracking during active stream rendering.
 */
class SnehScrollController {
    constructor(scrollContainer) {
        this.container = scrollContainer;
        this.userScrolledUp = false;
        this.scrollThreshold = 45; // Pixels from bottom to determine lock state

        this._onScroll = () => {
            const distanceFromBottom = this.container.scrollHeight - this.container.scrollTop - this.container.clientHeight;
            // If user scrolls up past threshold, lock automatic view adjustments
            this.userScrolledUp = (distanceFromBottom > this.scrollThreshold);
        };

        this.container.addEventListener("scroll", this._onScroll);
    }

    /**
     * Instantly pushes Scroll offset to the absolute bottom of container if allowed
     */
    scrollToBottom() {
        if (!this.userScrolledUp) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    }

    destroy() {
        this.container.removeEventListener("scroll", this._onScroll);
    }
}

// ============================================================================
// MAIN PIPELINE: SnehStreamRenderer
// ============================================================================
export class SnehStreamRenderer {
    /**
     * @param {HTMLElement} targetBubble - The active bubble element container where text renders.
     * @param {HTMLElement} scrollContainer - The scrollable chat list container element.
     */
    constructor(targetBubble, scrollContainer) {
        this.element = targetBubble;
        this.scrollController = scrollContainer ? new SnehScrollController(scrollContainer) : null;
        
        // Memory-efficient queuing
        this.isStreaming = false;
        this._accumulatedText = ""; 
        this._queue = [];           // Stores raw token chunks (no expensive char arrays)
        this._blockNodes = [];      // Track physical block DOM nodes to limit reflows
        
        // Loop controls
        this._loopActive = false;
        this._lastRenderTime = 0;
        
        // Adaptive Scheduler thresholds
        this._renderInterval = 50;  // Dynamically scales between 45ms and 110ms based on CPU speed
        this.baseTypingSpeed = 4;   // Typographic chunk processing depth
    }

    /**
     * Resets the rendering queue state machine and initializes loop
     */
    start() {
        this.isStreaming = true;
        this._accumulatedText = "";
        this._queue = [];
        this._lastRenderTime = 0;
        this._renderInterval = 50; 
        
        this.element.innerHTML = "";
        this._blockNodes = [];
        
        this.element.classList.add("is-streaming");
        this.startLoop();
    }

    /**
     * Receives raw string tokens. Safe to push long sequences directly.
     */
    pushToken(token) {
        if (token) {
            this._queue.push(token);
        }
    }

    /**
     * Flushes buffers and processes the final markdown syntax highlight pass.
     */
    end() {
        this.isStreaming = false;
        
        // Drain any remnants in queue
        if (this._queue.length > 0) {
            this._accumulatedText += this._queue.join("");
            this._queue = [];
        }

        this.forceFinalRender();
        this.element.classList.remove("is-streaming");
        
        if (this.scrollController) {
            this.scrollController.destroy();
        }
    }

    /**
     * Asynchronous animation scheduler loop
     */
    startLoop() {
        if (this._loopActive) return;
        this._loopActive = true;

        const processQueue = () => {
            if (!this.isStreaming && this._queue.length === 0) {
                this._loopActive = false;
                return;
            }

            if (this._queue.length > 0) {
                // Adaptive Typing intake rate
                let speed = this.baseTypingSpeed;
                if (this._queue.length > 30) {
                    speed = Math.ceil(this._queue.length / 5); // Rapid catch-up under congestion
                }

                const segments = this._queue.splice(0, speed);
                this._accumulatedText += segments.join("");
                
                this.scheduleRender();
            }

            requestAnimationFrame(processQueue);
        };

        requestAnimationFrame(processQueue);
    }

    /**
     * Formats the semantic display buffer, checking backwards from the tail end of text
     */
    getDisplayableText() {
        if (!this.isStreaming) {
            return this._accumulatedText;
        }

        const text = this._accumulatedText;
        
        // Backwards index matching for standard word boundaries
        const lastBoundaryIndex = Math.max(
            text.lastIndexOf(" "),
            text.lastIndexOf("\n"),
            text.lastIndexOf("."),
            text.lastIndexOf(","),
            text.lastIndexOf("!"),
            text.lastIndexOf("?"),
            text.lastIndexOf(";"),
            text.lastIndexOf(":"),
            text.lastIndexOf("-"),
            text.lastIndexOf("*"),
            text.lastIndexOf("_"),
            text.lastIndexOf("`"),
            text.lastIndexOf(")")
        );

        if (lastBoundaryIndex === -1) {
            return text.length > 20 ? text : "";
        }

        const trailingLength = text.length - lastBoundaryIndex;
        if (trailingLength > 20) {
            return text; // Flush if trailing fragment exceeds typical word boundary bounds
        }

        return text.substring(0, lastBoundaryIndex + 1);
    }

    /**
     * Throttles DOM updates dynamically based on system performance [3]
     */
    scheduleRender() {
        const now = performance.now();
        if (now - this._lastRenderTime >= this._renderInterval) {
            const startRenderTime = performance.now();
            
            const displayableText = this.getDisplayableText();
            if (displayableText) {
                const blocks = this.parseBlocks(displayableText);
                this.updateDOM(blocks);
                
                if (this.scrollController) {
                    this.scrollController.scrollToBottom();
                }
            }

            const renderDuration = performance.now() - startRenderTime;
            
            // Adjust interval for older/busier devices
            if (renderDuration > 15) { // Out of 16.6ms screen sync frame budget
                this._renderInterval = Math.min(110, this._renderInterval + 15);
            } else if (renderDuration < 5 && this._renderInterval > 50) {
                this._renderInterval = Math.max(50, this._renderInterval - 5);
            }

            this._lastRenderTime = now;
        }
    }

    /**
     * Splits streamed markdown into static blocks and the active block
     */
    parseBlocks(markdownText) {
        const lines = markdownText.split("\n");
        const blocks = [];
        let currentBlockLines = [];
        let inCodeBlock = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.trim().startsWith("```")) {
                inCodeBlock = !inCodeBlock;
                currentBlockLines.push(line);
                if (!inCodeBlock) {
                    blocks.push({ type: "code", text: currentBlockLines.join("\n"), incomplete: false });
                    currentBlockLines = [];
                }
                continue;
            }

            if (inCodeBlock) {
                currentBlockLines.push(line);
                continue;
            }

            if (line.trim() === "") {
                if (currentBlockLines.length > 0) {
                    blocks.push({ type: "markdown", text: currentBlockLines.join("\n"), incomplete: false });
                    currentBlockLines = [];
                }
            } else {
                currentBlockLines.push(line);
            }
        }

        if (currentBlockLines.length > 0) {
            blocks.push({
                type: inCodeBlock ? "code" : "markdown",
                text: currentBlockLines.join("\n"),
                incomplete: true
            });
        }

        return blocks;
    }

    /**
     * Maps the virtual blocks array structure directly to DOM containers
     */
    updateDOM(blocks) {
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            let blockNode = this._blockNodes[i];

            if (!blockNode) {
                blockNode = document.createElement("div");
                blockNode.className = "sneh-block-node";
                blockNode.setAttribute("data-block-type", block.type);
                this.element.appendChild(blockNode);
                this._blockNodes[i] = blockNode;
            }

            // Skip rendering static blocks that haven't modified
            if (block.incomplete || block.text !== blockNode._lastRawText) {
                let textToParse = block.text;
                let suffix = "";
                
                if (block.incomplete) {
                    suffix = this.trackMarkdownState(textToParse);
                }

                // Fast-Path: Skip the Markdown parsing layer if plain text (no special markdown indicators)
                const isPlainMarkdown = block.type === "markdown" && !/[\*\#\_`\[\]\~]/.test(textToParse);
                
                if (isPlainMarkdown) {
                    const cleanString = window.DOMPurify ? window.DOMPurify.sanitize(textToParse) : textToParse;
                    blockNode.innerHTML = `<p>${cleanString.replace(/\n/g, "<br>")}</p>`;
                } else {
                    blockNode.innerHTML = this.parseToHTML(textToParse + suffix);
                }
                
                blockNode._lastRawText = block.text;
            }
        }

        // Drop residual DOM elements
        while (this._blockNodes.length > blocks.length) {
            const obsoleteNode = this._blockNodes.pop();
            if (obsoleteNode) obsoleteNode.remove();
        }
    }

    /**
     * Token-aware, state-machine Markdown auto-closer.
     * Evaluates unclosed markers based on code-block nesting rules.
     */
    trackMarkdownState(text) {
        let inCodeBlock = false;
        let inInlineCode = false;
        let inBold = false;
        let inItalic = false;
        let i = 0;
        const len = text.length;

        while (i < len) {
            const char = text[i];
            const nextChar = text[i + 1] || "";
            const prevChar = text[i - 1] || "";

            // Evaluate multi-tick blocks
            if (char === "`" && nextChar === "`" && text[i + 2] === "`") {
                if (!inInlineCode) {
                    inCodeBlock = !inCodeBlock;
                }
                i += 3;
                continue;
            }

            if (inCodeBlock) {
                i++;
                continue;
            }

            // Inline Ticks
            if (char === "`") {
                inInlineCode = !inInlineCode;
                i++;
                continue;
            }

            if (inInlineCode) {
                i++;
                continue;
            }

            // Double Asterisks Bold state
            if (char === "*" && nextChar === "*") {
                if (prevChar !== "\\") {
                    inBold = !inBold;
                }
                i += 2;
                continue;
            }

            // Single Asterisk Italic state
            if (char === "*") {
                if (prevChar !== "\\") {
                    inItalic = !inItalic;
                }
                i++;
                continue;
            }

            i++;
        }

        let autoCloseSuffix = "";
        if (inInlineCode) autoCloseSuffix += "`";
        if (inBold) autoCloseSuffix += "**";
        if (inItalic) autoCloseSuffix += "*";
        if (inCodeBlock) autoCloseSuffix += "\n```";

        return autoCloseSuffix;
    }

    /**
     * Converts markdown to HTML string safely
     */
    parseToHTML(text) {
        let html = "";
        if (window.marked && window.marked.parse) {
            html = window.marked.parse(text);
        } else {
            html = text;
        }

        if (window.DOMPurify) {
            return window.DOMPurify.sanitize(html);
        }
        return html;
    }

    /**
     * Full single-pass layout and syntax highlight engine execution on stream completion
     */
    forceFinalRender() {
        const finalRawText = this._accumulatedText;
        
        let html = "";
        if (window.marked && window.marked.parse) {
            html = window.marked.parse(finalRawText);
        } else {
            html = finalRawText;
        }

        if (window.DOMPurify) {
            html = window.DOMPurify.sanitize(html);
        }

        this.element.innerHTML = html;
        this._blockNodes = [];

        // Final high-fidelity syntax highlighting (executed only once)
        if (window.hljs) {
            const codeBlocks = this.element.querySelectorAll("pre code");
            codeBlocks.forEach(block => window.hljs.highlightElement(block));
        }

        if (this.scrollController) {
            this.scrollController.scrollToBottom();
        }
    }
}