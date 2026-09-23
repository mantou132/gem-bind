const quoteMermaidText = (value: string) => {
  const text = value.trim();
  if (!text || (text.startsWith('"') && text.endsWith('"'))) return text;
  return `"${text.replace(/(?<!\\)"/g, '\\"')}"`;
};

const repairRequirementDiagramSource = (source: string) => {
  if (!/^\s*requirementDiagram\b/m.test(source)) return source;

  return source
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('%%')) return line;

      const definition = line.match(
        /^(\s*)(requirement|functionalRequirement|interfaceRequirement|performanceRequirement|physicalRequirement|designConstraint|element)\s+(.+?)\s*\{\s*$/,
      );
      if (definition) {
        const [, indent, type, rawName] = definition;
        const [name, className] = rawName.split(/(?=:::)/, 2);
        return `${indent}${type} ${quoteMermaidText(name)}${className || ''} {`;
      }

      const propertyMatch = line.match(/^(\s*)(id|text|type|docref)\s*:\s*(.*?)\s*$/i);
      if (propertyMatch) {
        const [, indent, key, value] = propertyMatch;
        return `${indent}${key}: ${quoteMermaidText(value)}`;
      }

      const forward = line.match(
        /^(\s*)(.+?)\s+-\s+(contains|copies|derives|satisfies|verifies|refines|traces)\s+->\s+(.+?)\s*$/i,
      );
      if (forward) {
        const [, indent, from, relation, to] = forward;
        return `${indent}${quoteMermaidText(from)} - ${relation} -> ${quoteMermaidText(to)}`;
      }

      const backward = line.match(
        /^(\s*)(.+?)\s+<-\s+(contains|copies|derives|satisfies|verifies|refines|traces)\s+-\s+(.+?)\s*$/i,
      );
      if (backward) {
        const [, indent, to, relation, from] = backward;
        return `${indent}${quoteMermaidText(to)} <- ${relation} - ${quoteMermaidText(from)}`;
      }

      return line;
    })
    .join('\n');
};

const repairQuadrantChartSource = (source: string) => {
  if (!/^\s*quadrantChart\b/m.test(source)) return source;

  return source
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('%%')) return line;

      const axis = line.match(/^(\s*)([xy]-axis)\s+(.+?)\s*$/i);
      if (axis) {
        const [, indent, name, text] = axis;
        const parts = text.split(/\s*-->\s*/, 2);
        return `${indent}${name} ${parts.map(quoteMermaidText).join(' --> ')}`;
      }

      const quadrant = line.match(/^(\s*)(quadrant-[1-4])\s+(.+?)\s*$/i);
      if (quadrant) {
        const [, indent, name, text] = quadrant;
        return `${indent}${name} ${quoteMermaidText(text)}`;
      }

      const point = line.match(/^(\s*)(.+?)(:::\w+)?\s*:\s*(\[[^\]]+\].*)$/);
      if (point) {
        const [, indent, label, className = '', rest] = point;
        return `${indent}${quoteMermaidText(label)}${className}: ${rest}`;
      }

      return line;
    })
    .join('\n');
};

type MermaidRepair = {
  source: string;
  replacements?: Map<string, string>;
};

const repairSankeyLine = (line: string) =>
  !line.includes(',') && (line.match(/，/g)?.length || 0) === 2 ? line.replaceAll('，', ',') : line;

const repairSankeySource = (source: string): MermaidRepair => {
  if (!/^\s*sankey(?:-beta)?\b/m.test(source)) return { source };

  const replacements = new Map<string, string>();
  const tokens = new Map<string, string>();
  let index = 0;
  const makeToken = (value: string) => {
    const existing = tokens.get(value);
    if (existing) return existing;
    let token = `MMDU${index++}MMD`;
    while (source.includes(token)) token = `MMDU${index++}MMD`;
    tokens.set(value, token);
    replacements.set(token, value);
    return token;
  };

  const repaired = source
    .split('\n')
    .map((line, lineIndex) => {
      if (lineIndex === 0 || !line.trim() || line.trim().startsWith('%%')) return line;

      // LLMs often emit Chinese commas as CSV separators.
      let next = repairSankeyLine(line);

      // Mermaid's Sankey lexer only accepts ASCII, even inside quoted CSV fields.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: match non-ascii
      next = next.replace(/[^\x00-\x7F]+/g, makeToken);
      return next;
    })
    .join('\n');

  return { source: repaired, replacements };
};

const repairFlowchartSource = (source: string) => {
  if (!/^\s*(?:flowchart|graph)\b/m.test(source)) return source;
  return source
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('%%')) return line;
      // Skip quoted strings and stop at the edge label's closing pipe, not a pipe in the target node.
      return line.replace(
        /"(?:\\.|[^"\\])*"|([-=.~<>ox]+)\|("(?:\\.|[^"\\])*"|[^|\n]*)\|/g,
        (match, arrow: string | undefined, label: string) => (arrow ? `${arrow}|${quoteMermaidText(label)}|` : match),
      );
    })
    .join('\n');
};

export const repairMermaidSource = (source: string) => {
  if (/^\s*requirementDiagram\b/m.test(source)) return repairRequirementDiagramSource(source);
  if (/^\s*quadrantChart\b/m.test(source)) return repairQuadrantChartSource(source);
  if (/^\s*sankey(?:-beta)?\b/m.test(source)) {
    return source
      .split('\n')
      .map((line) => (line.trim().startsWith('%%') ? line : repairSankeyLine(line)))
      .join('\n');
  }
  return repairFlowchartSource(source);
};

export const repairMermaidRenderSource = (source: string): MermaidRepair => {
  if (/^\s*sankey(?:-beta)?\b/m.test(source)) return repairSankeySource(source);
  return { source: repairMermaidSource(source) };
};
