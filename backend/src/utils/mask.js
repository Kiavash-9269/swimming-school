/**
 * Mask Iranian mobile for safe logs: 0912***6789
 */
function maskPhone(phone) {
  const value = String(phone || "");
  if (value.length < 8) {
    return "***";
  }
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

module.exports = {
  maskPhone,
};
