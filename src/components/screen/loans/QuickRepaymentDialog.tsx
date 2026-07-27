import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import type { AnimalType, Repayment } from "@/db/types";
import type { LoanRow } from "./loans.constants";

interface QuickRepaymentDialogProps {
  loan: LoanRow | null;
  animalTypes: AnimalType[];
  onClose: () => void;
  onSuccess: (repayment: Repayment) => Promise<void>;
}

export function QuickRepaymentDialog({
  loan,
  animalTypes,
  onClose,
  onSuccess,
}: QuickRepaymentDialogProps) {
  const [repaymentType, setRepaymentType] = useState("money");
  const [moneyAmount, setMoneyAmount] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  if (!loan) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const repayment: Repayment = {
        id: crypto.randomUUID(),
        repaymentType: repaymentType as "animal" | "money",
        date: date || new Date().toISOString().slice(0, 10),
        witnesses: [],
        ...(repaymentType === "money"
          ? { moneyAmount: Number(moneyAmount) || 0 }
          : { animalType, quantity: Number(quantity) || 1 }),
      };
      await onSuccess(repayment);
      setMoneyAmount("");
      setAnimalType("");
      setQuantity("1");
      setDate(new Date().toISOString().slice(0, 10));
    } catch {
      toast.error("Gagal menambah pembayaran");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!loan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bayar Pinjaman</DialogTitle>
          <DialogDescription>
            {loan.borrowerName} → {loan.lenderName} | Sisa: Rp{" "}
            {(loan.remainingValue || 0).toLocaleString("id-ID")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Jenis Pembayaran</Label>
            <NativeSelect
              value={repaymentType}
              onChange={(e) => setRepaymentType(e.target.value)}
            >
              <NativeSelectOption value="money">Uang</NativeSelectOption>
              <NativeSelectOption value="animal">Hewan</NativeSelectOption>
            </NativeSelect>
          </div>

          {repaymentType === "money" && (
            <div className="space-y-2">
              <Label>Jumlah (Rp)</Label>
              <Input
                type="number"
                value={moneyAmount}
                onChange={(e) => setMoneyAmount(e.target.value)}
                placeholder="10000000"
                required
              />
            </div>
          )}

          {repaymentType === "animal" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hewan</Label>
                <NativeSelect
                  value={animalType}
                  onChange={(e) => setAnimalType(e.target.value)}
                  required
                >
                  <NativeSelectOption value="">Pilih</NativeSelectOption>
                  {animalTypes.map((a) => (
                    <NativeSelectOption key={a.id} value={a.id}>
                      {a.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label>Jumlah</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tanggal Pembayaran</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Catat Pembayaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
