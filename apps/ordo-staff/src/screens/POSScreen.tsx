import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getTenant, placeOrder } from "../api";
import type {
  Tenant,
  MenuItem,
  Order,
  ModifierGroup,
  LineModifier,
  StockItem,
} from "../types";
import { ReceiptView } from "../components/ReceiptView";
import { theme, radius } from "../theme";

type Line = {
  key: string;
  item: MenuItem;
  qty: number;
  modifiers: LineModifier[];
  unitPrice: number;
};

const PAYMENTS = ["cash", "card", "wallet"] as const;
type Pay = (typeof PAYMENTS)[number];

function lineUnitPrice(base: number, mods: LineModifier[]) {
  return base + mods.reduce((s, m) => s + m.priceDelta, 0);
}

function money(currency: string, n: number) {
  return `${currency} ${n.toLocaleString()}`;
}

export function POSScreen() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<Line[]>([]);
  const [pay, setPay] = useState<Pay>("cash");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  // Modifier picker
  const [modItem, setModItem] = useState<MenuItem | null>(null);
  const [modSel, setModSel] = useState<Record<string, string[]>>({});

  // Customer & payment fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [discountStr, setDiscountStr] = useState("");
  const [cashGiven, setCashGiven] = useState("");

  // Responsive: stack the charge panel below the item grid on narrow screens.
  const { width: winW } = useWindowDimensions();
  const stacked = winW < 720;

  // Double-submit guard (in addition to server-side idempotency)
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const d = await getTenant();
      setTenant(d.tenant);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const cats = useMemo(() => {
    const s = new Set((tenant?.menu || []).map((m) => (m.isDeal ? "Deals" : m.category)));
    return ["All", ...[...s]];
  }, [tenant?.menu]);

  const items = useMemo(() => {
    const all = tenant?.menu || [];
    if (cat === "All") return all;
    if (cat === "Deals") return all.filter((m) => m.isDeal || m.category === "Deals");
    return all.filter((m) => !m.isDeal && m.category === cat);
  }, [tenant?.menu, cat]);

  const stockOf = useCallback(
    (name: string): number | null => {
      const hit = (tenant?.stock || []).find(
        (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      return hit ? hit.quantity : null;
    },
    [tenant?.stock],
  );

  const lowStock = useMemo(
    () => (tenant?.stock || []).filter((s) => s.quantity <= s.lowThreshold),
    [tenant?.stock],
  );

  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discount = Math.max(0, Math.round(Number(discountStr) || 0));
  // Standard POS: discount before service charge & tax.
  const scPercent = tenant?.shop.serviceChargePercent || 0;
  const taxRate = tenant?.shop.taxRate || 0;
  const discountedBase = Math.max(0, subtotal - discount);
  const serviceCharge = Math.round((discountedBase * scPercent) / 100);
  const tax = Math.round(((discountedBase + serviceCharge) * taxRate) / 100);
  const total = discountedBase + serviceCharge + tax;
  const tendered = Math.round(Number(cashGiven) || 0);
  const change = pay === "cash" && tendered > 0 ? tendered - total : null;
  const cashShort = pay === "cash" && cashGiven.trim() !== "" && change !== null && change < 0;
  const canCharge = !busy && cart.length > 0 && customerName.trim() !== "" && !cashShort;

  const showMsg = (m: string) => setMsg(m);

  function startAdd(item: MenuItem) {
    if (!item.available) {
      showMsg(`${item.name} is 86`);
      return;
    }
    const avail = stockOf(item.name);
    if (avail !== null && avail <= 0) {
      showMsg(`${item.name} is out of stock (86)`);
      return;
    }
    if (item.modifiers?.length) {
      const init: Record<string, string[]> = {};
      item.modifiers.forEach((g) => {
        init[g.id] = g.required && g.options[0] ? [g.options[0].id] : [];
      });
      setModSel(init);
      setModItem(item);
      return;
    }
    addLine(item, []);
  }

  function addLine(item: MenuItem, modifiers: LineModifier[]) {
    const unitPrice = lineUnitPrice(item.price, modifiers);
    const key = `${item.id}:${modifiers.map((m) => m.optionId).sort().join(",")}`;
    const avail = stockOf(item.name);
    setCart((prev) => {
      const curQty = prev.reduce((s, p) => (p.item.id === item.id ? s + p.qty : s), 0);
      if (avail !== null && curQty + 1 > avail) {
        showMsg(
          avail <= 0 ? `${item.name} is out of stock (86)` : `${item.name}: only ${avail} left`,
        );
        return prev;
      }
      const hit = prev.find((p) => p.key === key);
      if (hit) return prev.map((p) => (p.key === key ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { key, item, qty: 1, modifiers, unitPrice }];
    });
  }

  function bumpQty(key: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((p) => {
        if (p.key !== key) return [p];
        const qty = p.qty + delta;
        if (qty <= 0) return [];
        if (delta > 0) {
          const avail = stockOf(p.item.name);
          if (avail !== null) {
            const onOtherLines = prev
              .filter((x) => x.key !== key && x.item.id === p.item.id)
              .reduce((s, x) => s + x.qty, 0);
            if (onOtherLines + qty > avail) {
              showMsg(
                avail <= 0
                  ? `${p.item.name} is out of stock (86)`
                  : `${p.item.name}: only ${avail} left`,
              );
              return [p];
            }
          }
        }
        return [{ ...p, qty }];
      }),
    );
  }

  const modsToLine = (groups: ModifierGroup[], sel: Record<string, string[]>): LineModifier[] => {
    const out: LineModifier[] = [];
    for (const g of groups) {
      for (const id of sel[g.id] || []) {
        const opt = g.options.find((o) => o.id === id);
        if (opt) {
          out.push({
            groupId: g.id,
            groupName: g.name,
            optionId: opt.id,
            optionName: opt.name,
            priceDelta: opt.priceDelta,
          });
        }
      }
    }
    return out;
  };

  async function charge() {
    if (!cart.length) {
      showMsg("Cart is empty");
      return;
    }
    if (!customerName.trim()) {
      showMsg("Enter the customer name first");
      return;
    }
    if (cashShort) {
      showMsg("Cash received is less than the total");
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setErr("");
    try {
      const order = await placeOrder({
        serviceType: "counter",
        paymentMethod: pay,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        note: note.trim() || undefined,
        discount: discount || undefined,
        lines: cart.map((l) => ({
          itemId: l.item.id,
          name: l.item.name,
          qty: l.qty,
          unitPrice: l.unitPrice,
          modifiers: l.modifiers.map((m) => ({ groupId: m.groupId, optionId: m.optionId })),
        })),
      });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setNote("");
      setDiscountStr("");
      setCashGiven("");
      showMsg(`Order #${order.number} placed`);
      setLastOrder(order);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  const clear = () => {
    if (!cart.length) return;
    Alert.alert("Clear bill", "Remove all items from this bill?", [
      { text: "Keep", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => setCart([]) },
    ]);
  };

  const qtyOf = (itemId: string) =>
    cart.filter((c) => c.item.id === itemId).reduce((s, c) => s + c.qty, 0);

  return (
    <View style={s.container}>
      {/* category chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={cats}
        keyExtractor={(c) => c}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.chip, cat === item && s.chipOn]} onPress={() => setCat(item)}>
            <Text style={[s.chipText, cat === item && s.chipTextOn]}>{item}</Text>
          </TouchableOpacity>
        )}
      />
      {err ? <Text style={s.err}>{err}</Text> : null}
      {lowStock.length > 0 ? (
        <Text style={s.lowStock}>
          Low stock: {lowStock.map((x: StockItem) => `${x.name} (${x.quantity})`).join(" · ")}
        </Text>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <View style={[s.body, stacked && s.bodyStack]}>
        {/* items grid */}
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          style={s.gridList}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListEmptyComponent={
            tenant ? (
              <Text style={s.cartEmpty}>No items in this category</Text>
            ) : (
              <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
            )
          }
          renderItem={({ item }) => {
            const qty = qtyOf(item.id);
            const avail = stockOf(item.name);
            const out = avail !== null && avail <= 0;
            return (
              <TouchableOpacity
                style={[s.item, (!item.available || out) && s.itemDim]}
                onPress={() => startAdd(item)}
                activeOpacity={0.7}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={s.itemImg} resizeMode="cover" />
                ) : item.imageEmoji ? (
                  <Text style={s.itemEmoji}>{item.imageEmoji}</Text>
                ) : null}
                <Text style={s.itemName} numberOfLines={2}>
                  {item.name}
                  {!item.available ? " · 86" : out ? " · 86" : ""}
                </Text>
                <Text style={s.itemPrice}>
                  {tenant?.shop.currency} {item.price}
                </Text>
                {qty > 0 && (
                  <View style={s.itemQty}>
                    <TouchableOpacity
                      onPress={() => bumpQty(item.id, -1)}
                      style={s.qtyBtn}
                      hitSlop={8}
                    >
                      <Text style={s.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyN}>{qty}</Text>
                    <TouchableOpacity
                      onPress={() => bumpQty(item.id, 1)}
                      style={s.qtyBtn}
                      hitSlop={8}
                    >
                      <Text style={s.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/* charge panel */}
        <ScrollView
          style={[s.panel, stacked && s.panelStack]}
          contentContainerStyle={s.panelContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.panelTop}>
            <Text style={s.panelQty}>
              {cart.reduce((sum, l) => sum + l.qty, 0)} items
            </Text>
            {cart.length > 0 ? (
              <TouchableOpacity onPress={clear}>
                <Text style={s.clearText}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* cart list */}
          <ScrollView style={s.cartList} nestedScrollEnabled>
            {cart.length === 0 ? (
              <Text style={s.cartEmpty}>Tap items to add</Text>
            ) : (
              cart.map((l) => (
                <View key={l.key} style={s.cartLine}>
                  <View style={s.cartLineL}>
                    <Text style={s.cartName} numberOfLines={1}>
                      {l.item.name}
                    </Text>
                    {l.modifiers.map((m) => (
                      <Text key={m.optionId} style={s.cartMod}>
                        +{m.optionName}
                      </Text>
                    ))}
                    <Text style={s.cartSub}>{money(tenant?.shop.currency || "PKR", l.unitPrice * l.qty)}</Text>
                  </View>
                  <View style={s.cartQty}>
                    <TouchableOpacity onPress={() => bumpQty(l.key, -1)} style={s.qtyBtn} hitSlop={8}>
                      <Text style={s.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyN}>{l.qty}</Text>
                    <TouchableOpacity onPress={() => bumpQty(l.key, 1)} style={s.qtyBtn} hitSlop={8}>
                      <Text style={s.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <Text style={s.currency}>{tenant?.shop.currency || "PKR"}</Text>

          <View style={s.fieldRow}>
            <Text style={s.label}>Customer name</Text>
            <TextInput
              style={s.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Walk-in guest"
              placeholderTextColor="#8b8177"
              autoComplete="name"
            />
          </View>
          <View style={s.fieldRow}>
            <Text style={s.label}>Phone</Text>
            <TextInput
              style={s.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="03xx…"
              placeholderTextColor="#8b8177"
              keyboardType="phone-pad"
            />
          </View>
          <View style={s.fieldRow}>
            <Text style={s.label}>Note</Text>
            <TextInput
              style={s.input}
              value={note}
              onChangeText={setNote}
              placeholder="Less spicy…"
              placeholderTextColor="#8b8177"
            />
          </View>
          <View style={s.fieldRow}>
            <Text style={s.label}>Discount</Text>
            <TextInput
              style={s.input}
              value={discountStr}
              onChangeText={(t) => setDiscountStr(t.replace(/[^\d]/g, ""))}
              placeholder="0"
              placeholderTextColor="#8b8177"
              keyboardType="numeric"
            />
          </View>
          {pay === "cash" ? (
            <View style={s.fieldRow}>
              <Text style={s.label}>Cash given</Text>
              <TextInput
                style={s.input}
                value={cashGiven}
                onChangeText={(t) => setCashGiven(t.replace(/[^\d]/g, ""))}
                placeholder="Amount"
                placeholderTextColor="#8b8177"
                keyboardType="numeric"
              />
            </View>
          ) : null}

          {subtotal > 0 ? (
            <View style={s.totals}>
              <Text style={s.totalLine}>Subtotal {money(tenant?.shop.currency || "PKR", subtotal)}</Text>
              {serviceCharge > 0 ? (
                <Text style={s.totalLine}>Service {money(tenant?.shop.currency || "PKR", serviceCharge)}</Text>
              ) : null}
              {tax > 0 ? (
                <Text style={s.totalLine}>Tax {money(tenant?.shop.currency || "PKR", tax)}</Text>
              ) : null}
              {discount > 0 ? (
                <Text style={s.totalLine}>Discount −{money(tenant?.shop.currency || "PKR", discount)}</Text>
              ) : null}
            </View>
          ) : null}

          <Text style={s.panelTotal}>{money(tenant?.shop.currency || "PKR", total)}</Text>
          {change !== null ? (
            <Text style={[s.change, change < 0 && s.changeNeg]}>
              {change >= 0 ? `Change ${money(tenant?.shop.currency || "PKR", change)}` : `Short ${money(tenant?.shop.currency || "PKR", -change)}`}
            </Text>
          ) : null}

          <View style={s.payRow}>
            {PAYMENTS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[s.payChip, pay === p && s.payChipOn]}
                onPress={() => setPay(p)}
              >
                <Text style={[s.payText, pay === p && s.payTextOn]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[s.charge, !canCharge && s.chargeOff]}
            onPress={() => void charge()}
            disabled={!canCharge}
          >
            <Text style={s.chargeText}>{busy ? "Placing…" : "Charge & print"}</Text>
          </TouchableOpacity>
          {!canCharge && !busy ? (
            <Text style={s.chargeHint}>
              {!cart.length
                ? "Add items to the bill"
                : !customerName.trim()
                ? "Customer name is required"
                : cashShort
                ? "Cash received is short"
                : ""}
            </Text>
          ) : null}
          {msg ? <Text style={s.ok}>{msg}</Text> : null}
          {cashShort ? <Text style={s.err}>Cash is short — fix amount</Text> : null}
        </ScrollView>
      </View>
      </KeyboardAvoidingView>

      {/* modifier picker */}
      <Modal visible={!!modItem} transparent animationType="fade" onRequestClose={() => setModItem(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Modifiers · {modItem?.name}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {(modItem?.modifiers || []).map((g) => (
                <View key={g.id} style={{ marginBottom: 14 }}>
                  <Text style={s.modGroupName}>
                    {g.name}
                    {g.required ? " *" : ""}
                  </Text>
                  <View style={s.modOptions}>
                    {g.options.map((o) => {
                      const on = (modSel[g.id] || []).includes(o.id);
                      return (
                        <TouchableOpacity
                          key={o.id}
                          style={[s.modChip, on && s.modChipOn]}
                          onPress={() => {
                            setModSel((prev) => {
                              const cur = prev[g.id] || [];
                              if (g.multi) {
                                return {
                                  ...prev,
                                  [g.id]: on ? cur.filter((x) => x !== o.id) : [...cur, o.id],
                                };
                              }
                              return { ...prev, [g.id]: [o.id] };
                            });
                          }}
                        >
                          <Text style={[s.modChipText, on && s.modChipTextOn]}>
                            {o.name}
                            {o.priceDelta
                              ? ` ${o.priceDelta > 0 ? "+" : ""}${o.priceDelta}`
                              : ""}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnGhost]}
                onPress={() => setModItem(null)}
              >
                <Text style={s.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalBtn}
                onPress={() => {
                  if (modItem) addLine(modItem, modsToLine(modItem.modifiers || [], modSel));
                  setModItem(null);
                }}
              >
                <Text style={s.modalBtnText}>Add to cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ReceiptView
        visible={!!lastOrder}
        order={lastOrder}
        currency={tenant?.shop.currency || "PKR"}
        onClose={() => setLastOrder(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  err: { color: theme.danger, paddingHorizontal: 12, fontWeight: "600" },
  lowStock: { color: theme.warning, paddingHorizontal: 12, fontWeight: "700", fontSize: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface,
  },
  chipOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.ink, fontWeight: "600" },
  chipTextOn: { color: "#fff", fontWeight: "800" },
  body: { flex: 1, flexDirection: "row" },
  bodyStack: { flexDirection: "column" },
  gridList: { flex: 1 },
  panelStack: { width: "100%", maxHeight: 300 },
  item: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 10,
    gap: 4,
  },
  itemDim: { opacity: 0.45 },
  itemImg: { width: "100%", height: 72, borderRadius: 8, marginBottom: 4 },
  itemEmoji: { fontSize: 28, marginBottom: 2 },
  itemName: { fontSize: 14, fontWeight: "700", color: theme.ink },
  itemPrice: { color: theme.muted, fontSize: 13 },
  itemQty: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface,
  },
  qtyBtnText: { fontWeight: "900", fontSize: 18, color: theme.accent },
  qtyN: { fontWeight: "800", fontSize: 15, minWidth: 20, textAlign: "center" },

  panel: { width: 230, backgroundColor: theme.darkSurface },
  panelContent: { padding: 14, gap: 8 },
  panelTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  panelQty: { color: "#c9c0b4", fontWeight: "700" },
  clearText: { color: "#ff9d2e", fontWeight: "800" },
  cartList: { maxHeight: 150 },
  cartEmpty: { color: "#8b8177", fontSize: 12, paddingVertical: 6 },
  cartLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  cartLineL: { flex: 1 },
  cartName: { color: "#fff", fontWeight: "700", fontSize: 13 },
  cartMod: { color: "#c9c0b4", fontSize: 11 },
  cartSub: { color: "#e8e4dc", fontSize: 12 },
  cartQty: { flexDirection: "row", alignItems: "center", gap: 6 },

  currency: { color: "#8b8177", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  fieldRow: { gap: 3 },
  label: { color: "#c9c0b4", fontSize: 11, fontWeight: "700" },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 14,
  },
  totals: { gap: 2, marginTop: 4 },
  totalLine: { color: "#c9c0b4", fontSize: 12 },
  panelTotal: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 },
  change: { color: "#7fe0ac", fontWeight: "700" },
  changeNeg: { color: "#ff9d2e" },
  payRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  payChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  payChipOn: { backgroundColor: theme.accent },
  payText: { color: "#e8e4dc", fontSize: 12, fontWeight: "700" },
  payTextOn: { color: "#120b07" },
  charge: {
    backgroundColor: theme.accent,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  chargeOff: { backgroundColor: "rgba(255,133,0,0.4)" },
  chargeText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  chargeHint: { color: "#e8b18a", fontSize: 12, textAlign: "center" },
  ok: { color: "#7fe0ac", fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 20 },
  modalSheet: { backgroundColor: theme.surface, borderRadius: radius.lg, padding: 18, gap: 14 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: theme.ink },
  modGroupName: { fontSize: 13, fontWeight: "800", color: theme.ink, marginBottom: 6 },
  modOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface,
  },
  modChipOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  modChipText: { color: theme.ink, fontWeight: "700", fontSize: 13 },
  modChipTextOn: { color: "#fff", fontWeight: "800" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, backgroundColor: theme.accent, borderRadius: 999, paddingVertical: 13, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "800" },
  modalBtnGhost: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
  modalBtnGhostText: { color: theme.ink, fontWeight: "700" },
});
