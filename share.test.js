const test = require("node:test");
const assert = require("node:assert");
const LZString = require("lz-string");
const ShareCodec = require("./share.js");

test("round-trips name and metadata with an empty list", () => {
  const snap = { name: "潜水清单", category: "海岛", notes: "记得防水", priority: "高", items: [] };
  const decoded = ShareCodec.decodeSharedList(ShareCodec.encodeSharedList(snap));
  assert.strictEqual(decoded.name, "潜水清单");
  assert.strictEqual(decoded.category, "海岛");
  assert.strictEqual(decoded.notes, "记得防水");
  assert.strictEqual(decoded.priority, "高");
  assert.deepStrictEqual(decoded.items, []);
});

test("round-trips a nested item tree by title and structure", () => {
  const snap = {
    name: "x", category: "", notes: "", priority: "",
    items: [
      { id: "a", title: "证件", packed: true, children: [
        { id: "b", title: "护照", packed: false, children: [] },
      ] },
    ],
  };
  const decoded = ShareCodec.decodeSharedList(ShareCodec.encodeSharedList(snap));
  assert.strictEqual(decoded.items.length, 1);
  assert.strictEqual(decoded.items[0].title, "证件");
  assert.strictEqual(decoded.items[0].children.length, 1);
  assert.strictEqual(decoded.items[0].children[0].title, "护照");
});

test("strips id and packed from the shared payload", () => {
  const decoded = ShareCodec.decodeSharedList(
    ShareCodec.encodeSharedList({
      name: "x", category: "", notes: "", priority: "",
      items: [{ id: "zzz", title: "手机", packed: true, children: [] }],
    })
  );
  const item = decoded.items[0];
  assert.strictEqual(item.title, "手机");
  assert.ok(!("id" in item), "id must not survive");
  assert.ok(!("packed" in item), "packed must not survive");
  assert.deepStrictEqual(item.children, []);
});

test("returns null for garbage / empty / non-string input", () => {
  assert.strictEqual(ShareCodec.decodeSharedList("not-a-valid-payload"), null);
  assert.strictEqual(ShareCodec.decodeSharedList(""), null);
  assert.strictEqual(ShareCodec.decodeSharedList(null), null);
});

test("returns null for an unknown schema version", () => {
  const bad = LZString.compressToEncodedURIComponent(JSON.stringify({ v: 999, n: "x", i: [] }));
  assert.strictEqual(ShareCodec.decodeSharedList(bad), null);
});

test("returns null when the item cap is exceeded", () => {
  const many = [];
  for (let i = 0; i < ShareCodec.MAX_ITEMS + 1; i++) many.push({ t: "x" });
  const huge = LZString.compressToEncodedURIComponent(
    JSON.stringify({ v: ShareCodec.SHARE_VERSION, n: "x", c: "", p: "", o: "", i: many })
  );
  assert.strictEqual(ShareCodec.decodeSharedList(huge), null);
});

test("truncates over-long titles to 200 chars", () => {
  const decoded = ShareCodec.decodeSharedList(
    ShareCodec.encodeSharedList({
      name: "x", category: "", notes: "", priority: "",
      items: [{ title: "字".repeat(300), children: [] }],
    })
  );
  assert.strictEqual(decoded.items[0].title.length, 200);
});

test("returns null when the depth cap is exceeded", () => {
  let node = { t: "leaf" };
  for (let i = 0; i < ShareCodec.MAX_DEPTH + 2; i++) node = { t: "x", c: [node] };
  const tooDeep = LZString.compressToEncodedURIComponent(
    JSON.stringify({ v: ShareCodec.SHARE_VERSION, n: "x", c: "", p: "", o: "", i: [node] })
  );
  assert.strictEqual(ShareCodec.decodeSharedList(tooDeep), null);
});
