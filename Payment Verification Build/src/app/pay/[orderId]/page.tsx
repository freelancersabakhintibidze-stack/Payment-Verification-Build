import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PayClient from "@/components/PayClient";
import { db } from "@/lib/db";
import { serializePayment } from "@/lib/serialize";
import { isDemo } from "@/lib/env";
import { qrSvg, solanaPayUrl } from "@/lib/qr";
import { orderIdSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderId: string }>;
}): Promise<Metadata> {
  const { orderId } = await params;
  return { title: `Receipt ${orderId}` };
}

export default async function PayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  if (!orderIdSchema.safeParse(orderId).success) {
    notFound();
  }

  const payment = await db.payment.findUnique({ where: { orderId } });
  if (!payment) {
    notFound();
  }

  const serialized = serializePayment(payment);
  const url = solanaPayUrl({
    recipient: payment.paymentAddress,
    amount: Number(payment.amount),
    memo: payment.memo,
    mint: payment.mint,
    label: "Aether Arena",
    message: payment.orderId,
  });
  const svg = await qrSvg(url);

  return (
    <div>
      <div className="border-b border-line bg-mist">
        <div className="shell flex items-center justify-between py-4">
          <p className="label text-muted">Payment receipt · Public page</p>
          <Link href="/dashboard" className="label text-secondary hover:text-ink">
            Dashboard →
          </Link>
        </div>
      </div>
      <div className="shell section-pad">
        <PayClient
          initialPayment={serialized}
          demo={isDemo()}
          qrSvg={svg}
          solanaPayUrl={url}
        />
      </div>
    </div>
  );
}
