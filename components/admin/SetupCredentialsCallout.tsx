import { IconKey } from "@/components/admin/icons";

type Props = {
  variant?: "banner" | "inline";
};

export function SetupCredentialsCallout({ variant = "banner" }: Props) {
  const box =
    variant === "banner"
      ? "rounded-2xl border border-primary/25 bg-gradient-to-br from-tint-primary/40 via-card to-tint-accent/20 p-6 shadow-elevated-sm"
      : "rounded-xl border border-border bg-muted/30 p-4";

  return (
    <div className={box}>
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <IconKey className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-2">
          <h3 className="font-display text-base font-semibold text-foreground">Server credentials needed</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add server credentials to <span className="font-mono text-xs">admin-hkr/.env.local</span>: either{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">FIREBASE_SERVICE_ACCOUNT_JSON</code>{" "}
            (paste the full JSON as one line) or{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">FIREBASE_SERVICE_ACCOUNT_PATH</code>{" "}
            pointing at the downloaded key file. Get the key from Firebase Console → Project settings → Service accounts
            → Generate new private key. Restart <code className="font-mono text-xs">npm run dev</code> after saving.
          </p>
          <p className="text-xs text-caption-foreground">
            The public <code className="font-mono">NEXT_PUBLIC_*</code> keys handle sign-in; the service account unlocks
            Firestore admin writes and Auth user management.
          </p>
        </div>
      </div>
    </div>
  );
}
