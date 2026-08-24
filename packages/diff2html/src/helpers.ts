// Vendored from diff2html `lib/ui/js/highlight.js-helpers` (MIT).
// They merge highlight.js output with the line's existing child elements,
// so word diff tags (<ins>/<del>) survive highlighting.

interface StreamEvent {
  event: 'start' | 'stop';
  offset: number;
  node: Element;
}

const tag = (node: Node) => (node as Element).nodeName.toLowerCase();
const escapeHTML = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Flatten an element tree into a sequence of open/close events tagged with text offsets. */
export function nodeStream(node: Node): StreamEvent[] {
  const result: StreamEvent[] = [];
  const walk = (node: Node, offset: number): number => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === Node.TEXT_NODE) {
        offset += (child.nodeValue || '').length;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        result.push({ event: 'start', offset, node: child as Element });
        offset = walk(child, offset);
        if (!tag(child).match(/br|hr|img|input/)) {
          result.push({ event: 'stop', offset, node: child as Element });
        }
      }
    }
    return offset;
  };
  walk(node, 0);
  return result;
}

/**
 * Interleave the original element boundaries into the highlighted HTML,
 * e.g. keeps `<ins>` wrapping its slice of the highlighted tokens.
 */
export function mergeStreams(original: StreamEvent[], highlighted: StreamEvent[], value: string): string {
  let processed = 0;
  let result = '';
  const nodeStack: Element[] = [];

  const selectStream = () => {
    if (!original.length || !highlighted.length) {
      return original.length ? original : highlighted;
    }
    if (original[0].offset !== highlighted[0].offset) {
      return original[0].offset < highlighted[0].offset ? original : highlighted;
    }
    return highlighted[0].event === 'start' ? original : highlighted;
  };
  const open = (node: Element) => {
    const attrs = [...node.attributes]
      .map((attr) => `${attr.nodeName}="${escapeHTML(attr.value).replace(/"/g, '&quot;')}"`)
      .join(' ');
    result += `<${tag(node)}${attrs ? ` ${attrs}` : ''}>`;
  };
  const close = (node: Element) => {
    result += `</${tag(node)}>`;
  };
  const render = (event: StreamEvent) => {
    (event.event === 'start' ? open : close)(event.node);
  };

  while (original.length || highlighted.length) {
    let stream = selectStream();
    result += escapeHTML(value.substring(processed, stream[0].offset));
    processed = stream[0].offset;
    if (stream === original) {
      nodeStack.reverse().forEach(close);
      do {
        render(stream.splice(0, 1)[0]);
        stream = selectStream();
      } while (stream === original && stream.length && stream[0].offset === processed);
      nodeStack.reverse().forEach(open);
    } else {
      if (stream[0].event === 'start') {
        nodeStack.push(stream[0].node);
      } else {
        nodeStack.pop();
      }
      render(stream.splice(0, 1)[0]);
    }
  }
  return result + escapeHTML(value.slice(processed));
}
