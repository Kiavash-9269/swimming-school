/**
 * Monetary amounts are integer IRR (rial) whole units.
 * Rounding: Math.round on percentage discounts; final never negative.
 */
function assertNonNegativeMoney(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Invalid money amount");
  }
  return Math.round(value);
}

function applyDiscount(basePrice, { type, value }) {
  const base = assertNonNegativeMoney(basePrice);
  const discountValue = Number(value);
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    throw new Error("Invalid discount value");
  }

  let finalPrice = base;
  if (type === "PERCENTAGE") {
    const pct = Math.min(100, discountValue);
    finalPrice = base - Math.round((base * pct) / 100);
  } else if (type === "FIXED") {
    finalPrice = base - Math.round(discountValue);
  }

  return Math.max(0, finalPrice);
}

module.exports = {
  assertNonNegativeMoney,
  applyDiscount,
};
