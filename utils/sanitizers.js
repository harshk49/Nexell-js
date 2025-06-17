import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

// Create a DOM window for DOMPurify
const { window } = new JSDOM("");
const DOMPurify = createDOMPurify(window);

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Configures DOMPurify to allow safe HTML for markdown rendering
 * while removing dangerous elements and attributes
 *
 * @param {String} content - The HTML content to sanitize
 * @returns {String} Sanitized HTML
 */
export const sanitizeHtml = (content) => {
  if (!content || typeof content !== "string") {
    return "";
  }

  // Configure DOMPurify to allow certain tags and attributes needed for markdown
  const config = {
    ALLOWED_TAGS: [
      // Basic formatting
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "br",
      "hr",
      "strong",
      "em",
      "del",
      "blockquote",
      "pre",
      "code",
      // Lists
      "ul",
      "ol",
      "li",
      // Tables
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      // Links and images (carefully configured)
      "a",
      "img",
      // Other elements useful in notes
      "sup",
      "sub",
      "mark",
      "span",
      "div",
    ],
    ALLOWED_ATTR: [
      // Core attributes
      "id",
      "class",
      "style",
      "dir",
      // Links and images
      "href",
      "src",
      "alt",
      "title",
      "target",
      "rel",
      // Tables
      "colspan",
      "rowspan",
      // Code
      "lang",
      // Content
      "data-*",
    ],
    FORBID_TAGS: [
      "script",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "style",
    ],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "eval"],
    ADD_ATTR: ["target"], // Allow target="_blank" for links
    ALLOW_DATA_ATTR: true, // Allow data-* attributes for markdown extensions
    USE_PROFILES: { html: true },
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    WHOLE_DOCUMENT: false,
    FORCE_BODY: false,
    URL_SAFE: true,
  };

  // Sanitize the content
  return DOMPurify.sanitize(content, config).trim();
};

/**
 * Sanitizes a string for use in logs or outputs
 * Removes any sensitive data patterns (e.g., tokens, passwords)
 *
 * @param {String} input - The string to sanitize
 * @returns {String} Sanitized string
 */
export const sanitizeLogString = (input) => {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Replace potential tokens, passwords, etc.
  return input
    .replace(/password=([^&]*)/gi, "password=[REDACTED]")
    .replace(/token=([^&]*)/gi, "token=[REDACTED]")
    .replace(/key=([^&]*)/gi, "key=[REDACTED]")
    .replace(/secret=([^&]*)/gi, "secret=[REDACTED]")
    .replace(
      /authorization:\s*bearer\s+[^\s]+/gi,
      "authorization: bearer [REDACTED]"
    )
    .trim();
};

/**
 * Sanitizes MongoDB query operators to prevent NoSQL injection
 * Removes $ prefixed keys from objects at any level
 *
 * @param {Object} obj - The object to sanitize
 * @returns {Object} A sanitized copy of the object
 */
export const sanitizeMongoQuery = (obj) => {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMongoQuery(item));
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip any key starting with $ to prevent MongoDB operators
    if (key.startsWith("$")) {
      continue;
    }

    // Recursively sanitize nested objects
    if (value && typeof value === "object") {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};
