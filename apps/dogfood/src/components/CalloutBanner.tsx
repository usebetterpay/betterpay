import { Button, PaymentStatusBanner } from '@betterpay/ui';
import { api } from '../lib/api';
import { useDogfood } from '../lib/state';

/**
 * Shared payment callout — polished banner + Open checkout when a live
 * sandbox link exists for the latest pending payment.
 */
export function CalloutBanner() {
  const { state, setState, run } = useDogfood();
  if (!state?.views.callout) return null;

  const callout = state.views.callout;
  const pending = state.payments.find(
    (p) =>
      p.status === 'pending' &&
      p.paymentUrl &&
      !p.paymentUrl.includes('simulate.local'),
  );

  return (
    <PaymentStatusBanner
      status={callout.status}
      title={callout.title}
      description={callout.description}
      dismissible
      onDismiss={() =>
        void run(async () => {
          setState(await api.dismissCallout());
        })
      }
      actions={
        pending ? (
          <Button size="sm" onClick={() => window.open(pending.paymentUrl, '_blank')}>
            Open checkout
          </Button>
        ) : callout.status === 'pending' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const p = state.payments.find((x) => x.status === 'pending');
              if (!p) return;
              void run(async () => {
                setState(await api.simulatePayment(p.id, 'paid'));
              });
            }}
          >
            Mark paid
          </Button>
        ) : undefined
      }
    />
  );
}
