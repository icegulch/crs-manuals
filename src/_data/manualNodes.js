import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function () {
  const manualsPath = path.join(__dirname, "manuals.json");
  const manuals = JSON.parse(fs.readFileSync(manualsPath, "utf8"));

  const all = [];

  for (const manual of manuals) {
    const { slug, nodes = [] } = manual;
    if (!Array.isArray(nodes)) continue;

    // index by node_id for ancestry lookups
    const byId = new Map(nodes.map((n) => [n.node_id, n]));

    // find nearest PAGE ancestor for a given node
    const nearestPageAncestor = (node) => {
      let cur = node;
      while (cur) {
        if (cur.type === "page") return cur;
        cur = cur.parent_node ? byId.get(cur.parent_node) : null;
      }
      return null;
    };

    // build path segments for a PAGE node by walking up page ancestors
    const pageSegments = (node) => {
      const segs = [];
      let cur = node;
      while (cur) {
        if (cur.type === "page") {
          // prefer crs_id for stable URLs; fall back to node_id
          segs.push(cur.crs_id || cur.node_id);
        }
        cur = cur.parent_node ? byId.get(cur.parent_node) : null;
      }
      return segs.reverse();
    };

    for (const node of nodes) {
      const {
        type = "page",
        node_id,
        parent_node = null,
        crs_id = null,
        level = 0,
        group = null,
        title,
        abbr = null,
      } = node;

      let permalink;

      if (type === "page") {
        // e.g. /{manual}/{100}/{110}/ or /{manual}/foreword/
        const segs = pageSegments(node);
        permalink = `/${slug}/${segs.join("/")}/`;
      } else {
        // heading/table/figure → anchor on nearest PAGE ancestor
        const page = nearestPageAncestor(node);
        const segs = page ? pageSegments(page) : [];
        const base = `/${slug}/${segs.join("/")}/`;
        permalink = `${base}#${node_id}`;
      }

      all.push({
        manual: slug,
        type,
        title,
        node_id,
        parent_node,
        crs_id,
        level,
        group,
        abbr,
        permalink,
      });
    }
  }

  return all;
}
