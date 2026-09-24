import { Request, Response } from 'express';
import * as paymentsService from './payments.service';
import { CreatePaywayCheckoutInput } from './payments.validation';

export const createPaywayCheckout = async (
  request: Request,
  response: Response,
) => {
  const { orderId } = request.body as CreatePaywayCheckoutInput;
  const session = await paymentsService.createCheckoutSession(
    request.auth!.user,
    orderId,
  );
  response.json(session);
};

/**
 * ABA PayWay calls this server-to-server, not a signed-in browser — there is
 * no session cookie to authenticate here. Always answers 200 so PayWay does
 * not retry indefinitely; anything genuinely wrong is logged instead of
 * surfaced as an error status.
 */
export const paywayCallback = async (request: Request, response: Response) => {
  try {
    await paymentsService.handleCallback(request.body as Record<string, unknown>);
  } catch (error) {
    console.error('[payway] callback handling failed:', error);
  }
  response.status(200).json({ received: true });
};
