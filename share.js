// share.js — pure share-link codec (no DOM, no Supabase).
// Loaded in the browser AFTER the lz-string CDN script (exposes global ShareCodec);
// also require()-able in Node for unit tests.
(function (root, factory) {
  var LZString =
    (root && root.LZString) ||
    (typeof require !== "undefined" ? require("lz-string") : null);
  var api = factory(LZString);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.ShareCodec = api;
  }
})(typeof self !== "undefined" ? self : this, function (LZString) {
  "use strict";

  var SHARE_VERSION = 1;
  var MAX_ITEMS = 1000;
  var MAX_DEPTH = 12;
  var MAX_TITLE_LEN = 200;
  var MAX_TEXT_LEN = 500;

  function clampText(value, fallback) {
    if (typeof value !== "string") {
      if (value === undefined || value === null) return fallback;
      value = String(value);
    }
    return value.slice(0, MAX_TEXT_LEN);
  }

  function stripItemsForShare(items) {
    if (!Array.isArray(items)) return [];
    return items.map(function (item) {
      var title = item && item.title != null ? String(item.title) : "";
      var node = { t: title.slice(0, MAX_TITLE_LEN) };
      var kids = stripItemsForShare(item && item.children);
      if (kids.length) node.c = kids;
      return node;
    });
  }

  function expandSharedItems(nodes, depth, counter) {
    depth = depth != null ? depth : 1;
    counter = counter || { n: 0 };
    if (!Array.isArray(nodes)) return [];
    if (depth > MAX_DEPTH) throw new Error("share: max depth exceeded");
    return nodes.map(function (node) {
      counter.n += 1;
      if (counter.n > MAX_ITEMS) throw new Error("share: too many items");
      var title = node && node.t != null ? String(node.t).slice(0, MAX_TITLE_LEN) : "";
      if (!title) title = "未命名物品";
      return {
        title: title,
        children: expandSharedItems(node && node.c, depth + 1, counter),
      };
    });
  }

  function encodeSharedList(snapshot) {
    var payload = {
      v: SHARE_VERSION,
      n: clampText(snapshot && snapshot.name, "未命名清单"),
      c: clampText(snapshot && snapshot.category, ""),
      p: clampText(snapshot && snapshot.priority, ""),
      o: clampText(snapshot && snapshot.notes, ""),
      i: stripItemsForShare(snapshot && snapshot.items),
    };
    return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  }

  function decodeSharedList(param) {
    if (typeof param !== "string" || !param) return null;
    try {
      var json = LZString.decompressFromEncodedURIComponent(param);
      if (!json) return null;
      var payload = JSON.parse(json);
      if (!payload || payload.v !== SHARE_VERSION) return null;
      var items = expandSharedItems(payload.i, 1, { n: 0 });
      return {
        name: clampText(payload.n, "未命名清单"),
        category: clampText(payload.c, ""),
        priority: clampText(payload.p, ""),
        notes: clampText(payload.o, ""),
        items: items,
      };
    } catch (err) {
      return null;
    }
  }

  return {
    SHARE_VERSION: SHARE_VERSION,
    MAX_ITEMS: MAX_ITEMS,
    MAX_DEPTH: MAX_DEPTH,
    stripItemsForShare: stripItemsForShare,
    expandSharedItems: expandSharedItems,
    encodeSharedList: encodeSharedList,
    decodeSharedList: decodeSharedList,
  };
});