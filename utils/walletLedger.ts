// Turns the wallet's raw ledger rows into what a person reads: one entry per ride
// (fare, commission, what was kept or paid) plus the other transactions as they are.

export type WalletTx = {
  _id?: string;
  id?: string;
  type: string;
  amount: number;
  feeAmount?: number;
  status?: string;
  description?: string;
  rideId?: string | { _id?: string } | null;
  reference?: string | null;
  paypackRef?: string | null;
  createdAt?: string;
};

export type RideRecord = {
  _id?: string;
  id?: string;
  fare?: number;
  offeredFare?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  rideStatus?: string;
  status?: string;
  pickup?: { name?: string; address?: string } | string;
  destination?: { name?: string; address?: string } | string;
  pickupLocation?: string;
  dropoffLocation?: string;
  passengerPhone?: string;
  vehicleType?: string;
  distance?: number;
  estimatedDistanceKm?: number;
  actualDistanceKm?: number;
  actualDurationMin?: number;
  estimatedDurationMin?: number;
  commissionAmount?: number;
  driverEarning?: number;
  tipAmount?: number;
  createdAt?: string;
  completedAt?: string;
  driverId?: { firstName?: string; lastName?: string } | string;
};

export type RideEntry = {
  kind: "ride";
  key: string;
  rideId: string;
  ride?: RideRecord;
  rows: WalletTx[];
  createdAt?: string;
  fare: number;
  commission: number;
  commissionOwed: boolean;
  tip: number;
  method: "cash" | "momo" | "wallet" | string;
  pending: boolean;
};
export type TxEntry = { kind: "tx"; key: string; tx: WalletTx };
export type LedgerEntry = RideEntry | TxEntry;

// Deductions the backend stores as positive amounts.
export const DEBIT_TYPES = new Set([
  "platform_commission", "commission", "cash_out", "cash_out_fee", "transaction_fee",
  "fine_payment", "fine_loan_repayment", "agent_pay_fine", "admin_debit",
  "p2p_transfer_sent", "p2p_transfer_fee",
]);
export const isCredit = (tx: WalletTx) => Number(tx.amount) >= 0 && !DEBIT_TYPES.has(tx.type);

const RIDE_TYPES = new Set(["ride_payment", "commission", "platform_commission", "cash_in"]);
const COMMISSION_TYPES = new Set(["commission", "platform_commission"]);

export const idOf = (v: { _id?: string; id?: string } | string | null | undefined) =>
  v == null ? "" : typeof v === "string" ? v : String(v._id || v.id || "");
export const placeName = (v: RideRecord["pickup"], fallback?: string) =>
  (typeof v === "string" ? v : v?.name || v?.address) || fallback || "";

const fareFromText = (text?: string) => {
  const m = text?.match(/fare:?\s*([\d,]+)/i);
  return m ? Number(m[1].replace(/,/g, "")) : 0;
};

/** The fare of a ride from its record, or failing that from its ledger rows. */
function rideFare(ride: RideRecord | undefined, rows: WalletTx[]) {
  if (ride?.fare) return Number(ride.fare);
  const earning = rows.find((r) => r.type === "ride_payment" && Number(r.amount) > 0);
  if (earning) return Number(earning.amount) + Number(earning.feeAmount || 0);
  const paid = rows.find((r) => r.type === "ride_payment" && Number(r.amount) < 0);
  if (paid) return Math.abs(Number(paid.amount));
  const momo = rows.find((r) => r.type === "cash_in");
  if (momo) return Math.abs(Number(momo.amount));
  for (const r of rows) { const f = fareFromText(r.description); if (f) return f; }
  return 0;
}

function rideMethod(ride: RideRecord | undefined, rows: WalletTx[]) {
  if (ride?.paymentMethod) return ride.paymentMethod.toLowerCase();
  if (rows.some((r) => r.type === "commission")) return "cash";
  if (rows.some((r) => r.type === "cash_in")) return "momo";
  return "wallet";
}

/**
 * Driver: a ride is money in (the fare), with the commission shown under it.
 * Passenger: a ride is money out (what they paid from the wallet).
 */
export function buildLedger(txs: WalletTx[], rides: RideRecord[], passenger: boolean): LedgerEntry[] {
  const rideById = new Map(rides.map((r) => [idOf(r), r]));
  const groups = new Map<string, WalletTx[]>();
  const out: LedgerEntry[] = [];
  const firstIndex = new Map<string, number>();

  txs.forEach((tx, i) => {
    const rideId = idOf(tx.rideId);
    const groupable = rideId && (passenger ? tx.type === "ride_payment" : RIDE_TYPES.has(tx.type));
    if (!groupable) { out.push({ kind: "tx", key: idOf(tx) || `tx-${i}`, tx }); return; }
    if (!groups.has(rideId)) { groups.set(rideId, []); firstIndex.set(rideId, out.length); out.push(null as any); }
    groups.get(rideId)!.push(tx);
  });

  for (const [rideId, rows] of groups) {
    const ride = rideById.get(rideId);
    const commissionRows = rows.filter((r) => COMMISSION_TYPES.has(r.type));
    const earning = rows.find((r) => r.type === "ride_payment" && Number(r.amount) > 0);
    const commission = commissionRows.length
      ? commissionRows.reduce((sum, r) => sum + Math.abs(Number(r.amount)), 0)
      : Number(earning?.feeAmount || ride?.commissionAmount || 0);
    const settled = rows.filter((r) => r.status !== "failed");
    out[firstIndex.get(rideId)!] = {
      kind: "ride",
      key: `ride-${rideId}`,
      rideId,
      ride,
      rows,
      createdAt: rows[0]?.createdAt || ride?.completedAt || ride?.createdAt,
      fare: rideFare(ride, rows),
      commission,
      commissionOwed: commissionRows.some((r) => r.status === "pending"),
      tip: Number(ride?.tipAmount || 0),
      method: rideMethod(ride, rows),
      pending: settled.length > 0 && settled.every((r) => r.status === "pending" && !COMMISSION_TYPES.has(r.type)),
    };
  }
  return out;
}
