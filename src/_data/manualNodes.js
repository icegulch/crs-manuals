// src/_data/manualNodes.js
// ESM: runs in Eleventy data cascade
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Normalize legacy node shapes and infer anchor_type when missing.
 * - We standardize `type` to "content" | "table" | "figure"
 * - We set `anchor_type` for content as "page" or "section"
 *   * level 0 => page
 *   * alpha-suffixed crs_id (e.g. 312a) => page
 *   * everything else => section
 * - If input used old types:
 *   * type:"page"     -> type:"content", anchor_type:"page"
 *   * type:"heading"  -> type:"content", anchor_type:"section"
 */
function normalizeContentAndAnchorType(raw) {
  let type = raw.type;
  let anchor_type = raw.anchor_type ?? null;

  if (type === "page") {
    type = "content";
    anchor_type = "page";
  } else if (type === "heading") {
    type = "content";
    anchor_type = "section";
  } else if (type === "content" && !anchor_type) {
    // infer page vs section for unified "content"
    if ((raw.level ?? 0) === 0) {
      anchor_type = "page";
    } else {
      const crs = String(raw.crs_id ?? raw.node_id ?? "");
      anchor_type = /[a-z]$/i.test(crs) ? "page" : "section";
    }
  }

  return { type, anchor_type };
}

// prefer crs_id if present; otherwise node_id
const segFor = (it) => String(it?.crs_id ?? it?.node_id ?? "");

// walk up to root, collecting node objects
function chainToRoot(node, byId) {
  const chain = [];
  let cur = node;
  while (cur) {
    chain.push(cur);
    cur = cur.parent_node ? byId.get(cur.parent_node) : null;
  }
  // chain currently [self, parent, grandparent, …]; reverse to [root..self]
  return chain.reverse();
}

// find nearest ancestor (including self) that is a page
function findPageAncestor(node, byId) {
  let cur = node;
  while (cur) {
    const { anchor_type } = cur;
    if (anchor_type === "page") return cur;
    cur = cur.parent_node ? byId.get(cur.parent_node) : null;
  }
  return null; // malformed tree; handled by caller
}

export default async function () {
  const manualsPath = path.join(__dirname, "manuals.json");
  const manuals = JSON.parse(fs.readFileSync(manualsPath, "utf8"));

  const all = [];

  for (const manual of manuals) {
    const manualSlug = manual.slug;
    const nodes = Array.isArray(manual.nodes) ? manual.nodes : [];
    if (!nodes.length) continue;

    // First pass: normalize type/anchor_type and index by node_id
    const prepared = [];
    const byId = new Map();
    for (const raw of nodes) {
      const { type, anchor_type } = normalizeContentAndAnchorType(raw);
      const n = {
        manual: manualSlug,
        type, // "content" | "table" | "figure"
        anchor_type: anchor_type ?? null, // "page" | "section" | null for table/figure
        crs_id: raw.crs_id ?? null,
        node_id: raw.node_id,
        table_id: raw.table_id ?? null,
        figure_id: raw.figure_id ?? null,
        parent_node: raw.parent_node ?? null,
        group: raw.group ?? null,
        level: raw.level ?? 0,
        title: raw.title ?? "",
        abbr: raw.abbr ?? null,
        is_series: !!raw.is_series,
        is_summary: !!raw.is_summary,
        // permalink filled in on second pass
        permalink: null,
      };
      prepared.push(n);
      if (n.node_id) byId.set(n.node_id, n);
    }

    // Second pass: compute permalinks with correct “page vs anchor” behavior
    for (const item of prepared) {
      let permalink = "";

      if (
        item.type === "table" ||
        item.type === "figure" ||
        (item.type === "content" && item.anchor_type === "section")
      ) {
        // Always anchor under nearest page ancestor
        const pageAncestor =
          findPageAncestor(byId.get(item.parent_node) ?? item, byId) ||
          byId.get(item.parent_node) ||
          item;
        let chain = chainToRoot(pageAncestor, byId); // includes pageAncestor as last element
        // Special case top-level non-numeric crs_id like "foreword"
        if (
          (pageAncestor.level ?? 0) === 0 &&
          pageAncestor.crs_id &&
          isNaN(Number(pageAncestor.crs_id))
        ) {
          chain = [pageAncestor];
        }
        const pathSegs = chain.map(segFor).filter(Boolean);
        permalink = `/${manualSlug}/${pathSegs.join("/")}/#${item.node_id}`;
      } else {
        // Real page (content/anchor_type:page)
        let chain = chainToRoot(item, byId); // includes self
        if (
          (item.level ?? 0) === 0 &&
          item.crs_id &&
          isNaN(Number(item.crs_id))
        ) {
          // /manual/foreword/
          chain = [item];
        }
        const pathSegs = chain.map(segFor).filter(Boolean);
        permalink = `/${manualSlug}/${pathSegs.join("/")}/`;
      }

      item.permalink = permalink;
    }

    all.push(...prepared);
  }

  return all;
}
