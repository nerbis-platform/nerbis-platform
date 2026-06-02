import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitiza HTML para prevenir XSS almacenado.
 * Permite solo tags y atributos seguros para contenido CMS.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b", "i", "em", "strong", "a", "p", "br",
      "ul", "ol", "li", "h2", "h3", "h4",
      "span", "div", "blockquote",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
  });
}
